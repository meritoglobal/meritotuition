/**
 * Files the website saves on the device (class recordings, marked-up PDFs) are
 * blob: downloads or navigator.share({ files }). A WebView ignores both, so the
 * page script below sends the file to the app in pieces, the app writes it to
 * its own storage and opens the share sheet ("Save to Files", Drive, etc).
 */
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";

/** Runs in the page before its own scripts. */
export const DOWNLOAD_BRIDGE = `(function () {
  if (window.__mmDownloads || !window.ReactNativeWebView) return;
  window.__mmDownloads = true;
  var post = function (o) { window.ReactNativeWebView.postMessage(JSON.stringify(o)); };
  var CHUNK = 384 * 1024;
  async function send(blob, name) {
    var id = Date.now() + "-" + Math.random().toString(36).slice(2);
    post({ mm: "dl-start", id: id, name: name || "file", mime: blob.type || "application/octet-stream", size: blob.size });
    for (var o = 0; o < blob.size; o += CHUNK) {
      var b = new Uint8Array(await blob.slice(o, o + CHUNK).arrayBuffer());
      var s = "";
      for (var i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
      post({ mm: "dl-chunk", id: id, data: btoa(s) });
    }
    post({ mm: "dl-end", id: id });
  }
  function grab(href, name) {
    fetch(href).then(function (r) { return r.blob(); }).then(function (b) { return send(b, name); })
      .catch(function () { post({ mm: "dl-fail" }); });
  }
  var isLocal = function (h) { return /^(blob:|data:)/.test(h || ""); };
  var click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.hasAttribute("download") && isLocal(this.href)) return grab(this.href, this.getAttribute("download"));
    return click.call(this);
  };
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[download]") : null;
    if (!a || !isLocal(a.href)) return;
    e.preventDefault();
    grab(a.href, a.getAttribute("download"));
  }, true);
  var share = navigator.share ? navigator.share.bind(navigator) : null;
  navigator.canShare = function (d) { return !!(d && ((d.files && d.files.length) || (share && (d.url || d.text)))); };
  navigator.share = async function (d) {
    if (d && d.files && d.files.length) { for (var f of d.files) await send(f, f.name); return; }
    if (share) return share(d);
    throw new DOMException("Share not supported", "NotAllowedError");
  };
})(); true;`;

type Open = { file: File; handle: ReturnType<File["open"]>; name: string; mime: string; size: number; got: number };

function b64ToBytes(b64: string): Uint8Array {
  const bin = globalThis.atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const safeName = (n: string) => n.replace(/[\\/:*?"<>|]+/g, "-").slice(0, 120) || "file";
const mb = (n: number) => `${(n / 1_048_576).toFixed(1)} MB`;

export function createDownloads(status: (s: string | null) => void) {
  const open = new Map<string, Open>();

  return {
    handle(raw: string) {
      let m: { mm?: string; id?: string; name?: string; mime?: string; size?: number; data?: string };
      try { m = JSON.parse(raw); } catch { return; }
      if (!m.mm?.startsWith("dl-")) return;
      try {
        if (m.mm === "dl-start" && m.id) {
          const dir = new Directory(Paths.document, "saved");
          if (!dir.exists) dir.create({ intermediates: true });
          const file = new File(dir, safeName(m.name ?? "file"));
          if (file.exists) file.delete();
          file.create();
          open.set(m.id, { file, handle: file.open(), name: file.name, mime: m.mime ?? "application/octet-stream", size: m.size ?? 0, got: 0 });
          status(`ফোনে সেভ হচ্ছে… ${m.size ? mb(m.size) : ""}`);
        } else if (m.mm === "dl-chunk" && m.id && m.data) {
          const o = open.get(m.id);
          if (!o) return;
          const bytes = b64ToBytes(m.data);
          o.handle.writeBytes(bytes);
          o.got += bytes.length;
          if (o.size) status(`ফোনে সেভ হচ্ছে… ${Math.min(100, Math.round((o.got / o.size) * 100))}%`);
        } else if (m.mm === "dl-end" && m.id) {
          const o = open.get(m.id);
          if (!o) return;
          o.handle.close();
          open.delete(m.id);
          status(null);
          Alert.alert("সেভ হয়ে গেছে", `${o.name} (${mb(o.got)}) অ্যাপে রাখা আছে। Files, Downloads বা Drive-এ রাখতে চাইলে শেয়ার করো।`, [
            { text: "পরে" },
            { text: "শেয়ার / সেভ করি", onPress: () => void Sharing.shareAsync(o.file.uri, { mimeType: o.mime, dialogTitle: o.name }).catch(() => {}) },
          ]);
        } else if (m.mm === "dl-fail") {
          status(null);
          Alert.alert("সেভ করা গেল না", "আবার চেষ্টা করো। বারবার না হলে আমাদের জানাও।");
        }
      } catch {
        status(null);
        Alert.alert("সেভ করা গেল না", "ফোনে জায়গা আছে কিনা একবার দেখে নাও।");
      }
    },
  };
}
