/**
 * A page of the website (login, booking, live class, lecture sheet...) inside the
 * app, under a native header. Native extras: camera/mic and keep-awake in class,
 * Android back button, offline screen, other sites opened outside, and files the
 * page saves (class recordings are blob: downloads) written to the phone.
 * Our content (lecture sheets, exams, prep) is view-only: no downloads, no copy,
 * no print, and nothing kept in the page cache. Screenshots stay allowed (owner's call).
 */
import * as SplashScreen from "expo-splash-screen";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, BackHandler, PermissionsAndroid, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from "react-native-webview";
import { DOWNLOAD_BRIDGE, createDownloads } from "../src/downloads";
import { SITE } from "../src/site";
import { APP_AGENT, DIGITAL_SALE, HIDE_DIGITAL_SALES, STORE } from "../src/store";
import { SITE_HOSTS, colors } from "../src/theme";
import { Button, Ionicons } from "../src/ui";

const FILE_RE = /\.(pdf|pptx?|docx?|xlsx?|zip|mp4)(\?|$)/i;
const isOurs = (url: string) => {
  try { return SITE_HOSTS.includes(new URL(url).host); } catch { return false; }
};
// bKash checkout stays inside the app so the payment callback lands back on our page.
const isPayment = (url: string) => {
  try { return /(^|\.)(bka\.sh|bkash\.com)$/.test(new URL(url).host); } catch { return false; }
};
const isClass = (url: string) => /\/class\/[^/?#]+/.test(url);
// Paid/owned content: sheets, exams, model tests, class prep.
const isContent = (url: string) =>
  /\/(content|learn|sheets?|exams?|model-test|leaderboard|teach\/prep|teach\/exams?|api\/content)(\/|\?|#|$)/.test(url);

// Runs on content pages: no text selection, copy, right-click/long-press menu, drag or print.
const LOCK_CONTENT = `(function(){
  if (window.__mmLocked) return; window.__mmLocked = true;
  var css = document.createElement('style');
  css.textContent = '*{-webkit-user-select:none!important;user-select:none!important;-webkit-touch-callout:none!important}@media print{body{display:none!important}}';
  (document.head||document.documentElement).appendChild(css);
  ['copy','cut','contextmenu','dragstart','selectstart'].forEach(function(t){document.addEventListener(t,function(e){e.preventDefault();},true);});
  window.print = function(){};
  true;
})();`;

async function askCameraMic() {
  if (Platform.OS !== "android") return; // iOS asks on first use (Info.plist strings in app.json)
  await PermissionsAndroid.requestMultiple([PermissionsAndroid.PERMISSIONS.CAMERA, PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]).catch(() => null);
}

export default function WebPage() {
  const { path = "/", title = "মাস্টারমশাই" } = useLocalSearchParams<{ path?: string; title?: string }>();
  const web = useRef<WebView>(null);
  const [canBack, setCanBack] = useState(false);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const inClass = useRef(false);
  const downloads = useRef(createDownloads(setSaving));
  const [locked, setLocked] = useState(false);
  const src = `${SITE}${path.startsWith("/") ? path : `/${path}`}${path.includes("?") ? "&" : "?"}source=app`;

  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => {});
    if (isClass(src)) { inClass.current = true; void askCameraMic(); void activateKeepAwakeAsync("class"); }
    setLocked(isContent(src));
    return () => { if (inClass.current) deactivateKeepAwake("class"); };
  }, [src]);


  // Android back walks back through pages first, then closes this screen.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canBack) { web.current?.goBack(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [canBack]);

  const onNav = useCallback((nav: WebViewNavigation) => {
    setCanBack(nav.canGoBack);
    const now = isClass(nav.url);
    if (now && !inClass.current) { void askCameraMic(); void activateKeepAwakeAsync("class"); }
    if (!now && inClass.current) deactivateKeepAwake("class");
    inClass.current = now;
    const lock = isContent(nav.url);
    setLocked(lock);
    if (lock) web.current?.injectJavaScript(LOCK_CONTENT);
  }, []);

  // Our pages stay inside; other sites, bKash, phone links and files open outside.
  const onRequest = useCallback((req: { url: string; isTopFrame?: boolean }) => {
    const { url } = req;
    if (url.startsWith("about:")) return true;
    // Store builds never open a page that sells digital goods (store billing rules).
    if (STORE && HIDE_DIGITAL_SALES && isOurs(url) && DIGITAL_SALE.test(url)) return false;
    // Nothing leaves a content page as a file.
    if (isContent(url) && FILE_RE.test(url)) return false;
    if (url.startsWith("blob:") || url.startsWith("data:")) return true;
    if ((isOurs(url) || isPayment(url)) && !FILE_RE.test(url)) return true;
    if (req.isTopFrame === false) return true; // embedded frames (e.g. video players)
    void Linking.openURL(url);
    return false;
  }, []);

  const lockedRef = useRef(false);
  lockedRef.current = locked;
  // Class recordings may be saved; nothing from a content page may.
  const onMessage = useCallback((e: WebViewMessageEvent) => {
    if (lockedRef.current) return;
    downloads.current.handle(e.nativeEvent.data);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.white }} edges={["top", "bottom"]}>
      <View style={st.bar}>
        <Pressable onPress={() => (canBack ? web.current?.goBack() : router.back())} hitSlop={10} style={st.icon}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={st.title} numberOfLines={1}>
          {title}
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={10} style={st.icon}>
          <Ionicons name="close" size={22} color={colors.ink} />
        </Pressable>
      </View>
      {offline ? (
        <View style={[st.fill, st.center, { backgroundColor: colors.chalk }]}>
          <Text style={st.h}>নেট গেছে বেড়াতে!</Text>
          <Text style={st.p}>ইন্টারনেট ফিরলেই আবার শুরু করা যাবে। ওয়াই-ফাই বা মোবাইল ডেটা একবার দেখে নাও।</Text>
          <Button label="আবার চেষ্টা করি" kind="board" onPress={() => { setOffline(false); web.current?.reload(); }} />
        </View>
      ) : (
        <WebView
          ref={web}
          source={{ uri: src }}
          style={st.fill}
          applicationNameForUserAgent={APP_AGENT}
          injectedJavaScriptBeforeContentLoaded={DOWNLOAD_BRIDGE}
          onMessage={onMessage}
          // Live class: camera, mic and inline video without extra taps.
          mediaCapturePermissionGrantType="grant"
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo
          // Login cookie and the class "remember my answers" storage.
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          domStorageEnabled
          javaScriptEnabled
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
          onNavigationStateChange={onNav}
          onShouldStartLoadWithRequest={onRequest}
          cacheEnabled={!locked}
          cacheMode={locked ? "LOAD_NO_CACHE" : "LOAD_DEFAULT"}
          onLoadEnd={() => { setLoading(false); if (lockedRef.current) web.current?.injectJavaScript(LOCK_CONTENT); }}
          onError={() => setOffline(true)}
          onContentProcessDidTerminate={() => web.current?.reload()}
          onRenderProcessGone={() => web.current?.reload()}
        />
      )}
      {loading && !offline ? (
        <View style={[StyleSheet.absoluteFill, st.center, { top: 52 }]} pointerEvents="none">
          <ActivityIndicator color={colors.board} size="large" />
        </View>
      ) : null}
      {saving ? (
        <View style={st.toast}>
          <ActivityIndicator color={colors.gold} size="small" />
          <Text style={st.toastText}>{saving}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", padding: 24 },
  bar: { flexDirection: "row", alignItems: "center", height: 52, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.white },
  icon: { padding: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.ink, marginLeft: 4 },
  h: { fontSize: 22, fontWeight: "700", color: colors.ink, marginBottom: 8 },
  p: { fontSize: 15, color: colors.muted, textAlign: "center", lineHeight: 24, marginBottom: 20 },
  toast: { position: "absolute", left: 16, right: 16, bottom: 28, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.board, borderRadius: 10, padding: 14 },
  toastText: { color: colors.white, fontSize: 14, flex: 1 },
});
