"use client";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  VideoTrack,
  isTrackReference,
  useChat,
  useConnectionQualityIndicator,
  useConnectionState,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useTrackToggle,
  useTracks,
  type TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import { ConnectionState, MediaDeviceFailure, RoomEvent, Track, VideoPresets, type Participant, type RoomOptions } from "livekit-client";
import { copy } from "@/lib/copy";
import { useLang } from "@/lib/lang-client";

type Role = "teacher" | "student";
const roleOf = (p?: Participant) => (p?.attributes?.role === "teacher" ? "teacher" : "student");

/**
 * Quality settings: simulcast + adaptive stream mean each viewer only pulls the
 * resolution their tile and network can use, so a weak phone connection in
 * Mirpur does not drag down the class. Screen share gets 1080p for slides.
 */
const ROOM_OPTIONS: RoomOptions = {
  adaptiveStream: true,
  dynacast: true,
  videoCaptureDefaults: { resolution: VideoPresets.h720.resolution },
  audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  publishDefaults: {
    simulcast: true,
    videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
    screenShareEncoding: { maxBitrate: 2_500_000, maxFramerate: 15 },
    dtx: true,
    red: true,
  },
};

export default function LiveRoom({ url, token, title, role, onLeave }: { url: string; token: string; title: string; role: Role; onLeave: (how: "left" | "failed") => void }) {
  const c = copy(useLang()).room.lk;
  const [err, setErr] = useState("");
  const connected = useRef(false);
  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect
      audio
      video
      options={ROOM_OPTIONS}
      onConnected={() => { connected.current = true; }}
      onDisconnected={() => onLeave(connected.current ? "left" : "failed")}
      onMediaDeviceFailure={(f) => setErr(f === MediaDeviceFailure.PermissionDenied ? c.noPerm : c.failed)}
      onError={() => setErr(c.failed)}
      className="flex h-[78vh] min-h-[520px] flex-col overflow-hidden rounded-xl bg-board text-white"
    >
      <Stage title={title} role={role} err={err} />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function Stage({ title, role, err }: { title: string; role: Role; err: string }) {
  const lang = useLang();
  const c = copy(lang).room;
  const room = useRoomContext();
  const state = useConnectionState();
  const [chatOpen, setChatOpen] = useState(false);
  const [, bump] = useState(0);

  // Re-render when someone raises or lowers a hand.
  useEffect(() => {
    const f = () => bump((n) => n + 1);
    room.on(RoomEvent.ParticipantAttributesChanged, f);
    return () => { room.off(RoomEvent.ParticipantAttributesChanged, f); };
  }, [room]);

  const participants = useParticipants();
  const tracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }, { source: Track.Source.ScreenShare, withPlaceholder: false }],
    { onlySubscribed: false },
  );

  const screen = tracks.find((t) => t.source === Track.Source.ScreenShare && isTrackReference(t));
  const teacherCam = tracks.find((t) => t.source === Track.Source.Camera && roleOf(t.participant) === "teacher");
  const main = screen ?? teacherCam;
  const strip = tracks.filter((t) => t.source === Track.Source.Camera && t !== main);
  const hands = participants.filter((p) => p.attributes?.hand === "1").map((p) => (p.isLocal ? c.lk.you : p.name || p.identity));

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
        <span className="truncate font-medium">{title}</span>
        <span className="flex shrink-0 items-center gap-3">
          <NetBadge />
          <span className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-redpen" /> {c.live}</span>
        </span>
      </div>

      {(state === ConnectionState.Connecting || state === ConnectionState.Reconnecting || err) && (
        <div className={`mx-2 mb-2 rounded-lg px-3 py-2 text-sm ${err ? "bg-redpen" : "bg-gold text-board"}`}>
          {err || (state === ConnectionState.Reconnecting ? c.lk.reconnecting : c.lk.connecting)}
        </div>
      )}
      {hands.length > 0 && <div className="mx-2 mb-2 rounded-lg bg-white/10 px-3 py-2 text-sm">{c.lk.hands(hands.join(", "))}</div>}

      <div className="flex min-h-0 flex-1 gap-2 px-2">
        <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg bg-black/40">
            {main ? <Tile t={main} fit={main === screen ? "contain" : "cover"} big /> : <Empty>{c.lk.noTeacherVideo}</Empty>}
          </div>
          {strip.length > 0 && (
            <div className="flex shrink-0 gap-2 overflow-x-auto md:w-48 md:flex-col md:overflow-y-auto">
              {strip.map((t) => (
                <div key={`${t.participant.identity}-${t.source}`} className="relative aspect-video w-40 shrink-0 overflow-hidden rounded-lg bg-black/40 md:w-full">
                  <Tile t={t} fit="cover" />
                </div>
              ))}
            </div>
          )}
        </div>
        {chatOpen && <ChatPanel />}
      </div>

      <Controls role={role} chatOpen={chatOpen} toggleChat={() => setChatOpen((v) => !v)} />
      <StartAudio label="🔊" className="sr-only" />
    </>
  );
}

function Tile({ t, fit, big }: { t: TrackReferenceOrPlaceholder; fit: "cover" | "contain"; big?: boolean }) {
  const c = copy(useLang()).room.lk;
  const p = t.participant;
  const label = `${p.isLocal ? c.you : p.name || p.identity}${roleOf(p) === "teacher" ? ` · ${c.teacher}` : ""}`;
  const live = isTrackReference(t) && !t.publication.isMuted;
  return (
    <>
      {live ? (
        <VideoTrack trackRef={t} className={`h-full w-full ${fit === "contain" ? "object-contain" : "object-cover"} ${p.isLocal && t.source === Track.Source.Camera ? "-scale-x-100" : ""}`} />
      ) : (
        <Empty><span className={`flex items-center justify-center rounded-full bg-white/15 font-semibold ${big ? "h-20 w-20 text-3xl" : "h-10 w-10 text-lg"}`}>{(p.name || p.identity).slice(0, 1).toUpperCase()}</span></Empty>
      )}
      <span className="absolute bottom-1.5 left-1.5 max-w-[90%] truncate rounded bg-black/60 px-2 py-0.5 text-xs">
        {p.attributes?.hand === "1" ? "✋ " : ""}{label}{!p.isMicrophoneEnabled ? " 🔇" : ""}
      </span>
      {p.isSpeaking && <span className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-gold" />}
    </>
  );
}

const Empty = ({ children }: { children: ReactNode }) => (
  <div className="flex h-full w-full items-center justify-center p-4 text-center text-sm text-white/70">{children}</div>
);

function NetBadge() {
  const c = copy(useLang()).room.lk;
  const { localParticipant } = useLocalParticipant();
  const { quality } = useConnectionQualityIndicator({ participant: localParticipant });
  const label = c.net[String(quality)] ?? "";
  if (!label) return null;
  const color = quality === "excellent" || quality === "good" ? "bg-leaf" : "bg-redpen";
  return <span className="hidden items-center gap-1.5 text-xs text-white/80 sm:flex"><span className={`h-2 w-2 rounded-full ${color}`} />{label}</span>;
}

function Controls({ role, chatOpen, toggleChat }: { role: Role; chatOpen: boolean; toggleChat: () => void }) {
  const c = copy(useLang()).room;
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const mic = useTrackToggle({ source: Track.Source.Microphone });
  const cam = useTrackToggle({ source: Track.Source.Camera });
  const scr = useTrackToggle({ source: Track.Source.ScreenShare, captureOptions: { audio: true, resolution: VideoPresets.h1080.resolution } });
  const handUp = localParticipant.attributes?.hand === "1";

  const btn = (on: boolean) => `rounded-lg px-3 py-2 text-sm font-semibold sm:px-4 ${on ? "bg-white/15 hover:bg-white/25" : "bg-white text-board"}`;
  return (
    <div className="flex flex-wrap justify-center gap-2 p-3 sm:gap-3 sm:p-4">
      <button disabled={mic.pending} onClick={() => mic.toggle()} className={btn(mic.enabled)}>{mic.enabled ? c.lk.mic : c.lk.micOff}</button>
      <button disabled={cam.pending} onClick={() => cam.toggle()} className={btn(cam.enabled)}>{cam.enabled ? c.lk.cam : c.lk.camOff}</button>
      {role === "teacher" && (
        <button disabled={scr.pending} onClick={() => scr.toggle()} className={scr.enabled ? "rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-board sm:px-4" : btn(true)}>
          {scr.enabled ? c.lk.screenOff : c.lk.screen}
        </button>
      )}
      {role === "student" && (
        <button onClick={() => localParticipant.setAttributes({ ...localParticipant.attributes, hand: handUp ? "0" : "1" })} className={handUp ? "rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-board sm:px-4" : btn(true)}>
          {handUp ? c.lk.handDown : c.lk.hand}
        </button>
      )}
      <button onClick={toggleChat} className={chatOpen ? "rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-board sm:px-4" : btn(true)}>{c.lk.chat}</button>
      <button onClick={() => room.disconnect()} className="rounded-lg bg-redpen px-3 py-2 text-sm font-semibold text-white sm:px-4">{c.leave}</button>
    </div>
  );
}

function ChatPanel() {
  const lang = useLang();
  const c = copy(lang).room.lk;
  const { send, chatMessages, isSending } = useChat();
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [chatMessages.length]);
  const fmt = useMemo(() => new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Dhaka" }), [lang]);

  return (
    <aside className="flex w-full max-w-[18rem] shrink-0 flex-col rounded-lg bg-chalk text-ink max-md:absolute max-md:inset-x-2 max-md:bottom-20 max-md:top-24 max-md:z-10 max-md:max-w-none">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-sm">
        {chatMessages.length === 0 && <p className="text-ink-3">{c.chatEmpty}</p>}
        {chatMessages.map((m) => (
          <div key={m.id}>
            <span className="font-semibold">{m.from?.isLocal ? c.you : m.from?.name || m.from?.identity}{roleOf(m.from) === "teacher" ? ` · ${c.teacher}` : ""}</span>
            <span className="ml-2 text-xs text-ink-3">{fmt.format(m.timestamp)}</span>
            <p className="whitespace-pre-wrap break-words">{m.message}</p>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form
        className="flex gap-2 border-t border-line p-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const v = text.trim();
          if (!v) return;
          setText("");
          await send(v.slice(0, 500));
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={c.chatPh} className="field min-w-0 flex-1 py-1.5! text-sm" />
        <button disabled={isSending} className="btn-board px-3! py-1.5! text-sm">{c.send}</button>
      </form>
    </aside>
  );
}
