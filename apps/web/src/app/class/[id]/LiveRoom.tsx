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
import { L } from "@/lib/l10n";
import { toolsCopy } from "@/lib/copy-tools";
import { useLang } from "@/lib/lang-client";
import { PollAnswer, PollComposer, PollLive, usePolls } from "./Polls";
import Board from "./Board";
import { isTouchDevice, portraitProcessor } from "@/lib/class/portrait";

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

export default function LiveRoom({ classId, url, token, title, role, onLeave }: { classId: string; url: string; token: string; title: string; role: Role; onLeave: (how: "left" | "failed") => void }) {
  const c = copy(useLang()).room.lk;
  // Tutor on a phone: send the camera as a tall 9:16 frame even when the phone lies sideways.
  const options = useMemo<RoomOptions>(
    () => (role === "teacher" && isTouchDevice()
      ? { ...ROOM_OPTIONS, videoCaptureDefaults: { ...ROOM_OPTIONS.videoCaptureDefaults, processor: portraitProcessor() } }
      : ROOM_OPTIONS),
    [role],
  );
  const [err, setErr] = useState("");
  const connected = useRef(false);
  const [recording, setRecording] = useState(false);
  // Full screen: native where the browser allows it (Android, desktop), and a
  // fixed overlay everywhere (iPhone Safari cannot full-screen a div).
  const wrap = useRef<HTMLDivElement>(null);
  const [fs, setFs] = useState(false);
  useEffect(() => {
    const f = () => {
      if (!document.fullscreenElement) {
        setFs(false);
        try { screen.orientation?.unlock?.(); } catch {}
      }
    };
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);
  const toggleFs = () => {
    if (fs) {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      setFs(false);
    } else {
      setFs(true);
      void wrap.current?.requestFullscreen?.().catch(() => {});
    }
  };
  // Board on a phone: go full screen and turn sideways, so the PDF gets the whole width.
  const landscape = async () => {
    setFs(true);
    try {
      if (!document.fullscreenElement) await wrap.current?.requestFullscreen?.();
      await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })?.lock?.("landscape");
    } catch {}
  };
  return (
    <div ref={wrap} className={fs ? "fixed inset-0 z-[70] bg-board" : ""}>
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect
      audio
      video
      options={options}
      onConnected={() => {
        connected.current = true;
        // Tutor in the room → start the class recording (no-op if already running or not set up).
        if (role === "teacher") {
          void fetch(`/api/class/${encodeURIComponent(classId)}/record?as=teacher`, { method: "POST" })
            .then((r) => r.json()).then((j) => setRecording(j.state === "started" || j.state === "already")).catch(() => {});
        }
      }}
      onDisconnected={() => onLeave(connected.current ? "left" : "failed")}
      onMediaDeviceFailure={(f) => setErr(f === MediaDeviceFailure.PermissionDenied ? c.noPerm : c.failed)}
      onError={() => setErr(c.failed)}
      className={`flex flex-col overflow-hidden bg-board text-white ${fs ? "h-dvh" : "h-[78vh] min-h-[520px] rounded-xl"}`}
    >
      <Stage classId={classId} title={title} role={role} err={err} fs={fs} toggleFs={toggleFs} landscape={landscape} recording={recording} />
      <RoomAudioRenderer />
    </LiveKitRoom>
    </div>
  );
}

function Stage({ classId, title, role, err, fs, toggleFs, landscape, recording }: { classId: string; title: string; role: Role; err: string; fs: boolean; toggleFs: () => void; landscape: () => Promise<void>; recording: boolean }) {
  const lang = useLang();
  const c = copy(lang).room;
  const room = useRoomContext();
  const state = useConnectionState();
  const [chatOpen, setChatOpen] = useState(false);
  const [screenOnly, setScreenOnly] = useState(false);
  const [composing, setComposing] = useState(false);
  const polls = usePolls(role);
  const [board, setBoard] = useState(false);
  const saveBoard = useRef<(() => Promise<void>) | null>(null);
  const [note, setNote] = useState("");
  useEffect(() => { if (!note) return; const k = setTimeout(() => setNote(""), 6000); return () => clearTimeout(k); }, [note]);
  const [, bump] = useState(0);
  // Chat lives here (always mounted) so messages sent while the panel is closed are kept.
  const chat = useChat();
  const [seen, setSeen] = useState(0);
  const unread = chatOpen ? 0 : chat.chatMessages.length - seen;
  useEffect(() => { if (chatOpen) setSeen(chat.chatMessages.length); }, [chatOpen, chat.chatMessages.length]);

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
  // While the tutor has the board open, their own board track is shown as the interactive board instead.
  const strip = tracks.filter((t) => t.source === Track.Source.Camera && t !== main);
  const focus = screenOnly && !!screen; // student chose to watch the shared screen only
  const hands = participants.filter((p) => p.attributes?.hand === "1").map((p) => (p.isLocal ? c.lk.you : p.name || p.identity));

  return (
    <>
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm short:py-1.5">
        <span className="truncate font-medium">{title}</span>
        <span className="flex shrink-0 items-center gap-3">
          <NetBadge />
          {recording && <span className="flex items-center gap-1.5 text-xs text-white/80"><span className="h-2 w-2 rounded-full bg-redpen" />{toolsCopy(lang).rec.recording}</span>}
          <span className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-redpen" /> {c.live}</span>
        </span>
      </div>

      {(state === ConnectionState.Connecting || state === ConnectionState.Reconnecting || err) && (
        <div className={`mx-2 mb-2 rounded-lg px-3 py-2 text-sm ${err ? "bg-redpen" : "bg-gold text-board"}`}>
          {err || (state === ConnectionState.Reconnecting ? c.lk.reconnecting : c.lk.connecting)}
        </div>
      )}
      {note && <div className="mx-2 mb-2 rounded-lg bg-white/10 px-3 py-2 text-sm">{note}</div>}
      {!focus && hands.length > 0 && <div className="mx-2 mb-2 rounded-lg bg-white/10 px-3 py-2 text-sm">{c.lk.hands(hands.join(", "))}</div>}

      <div className="relative flex min-h-0 flex-1 gap-2 px-2">
        <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row landscape:flex-row">
          <div className={`relative min-h-0 flex-1 overflow-hidden rounded-lg ${board ? "" : "bg-black/40"}`}>
            {board ? (
              <Board classId={classId} saveRef={saveBoard} onClose={() => setBoard(false)} onStatus={setNote} />
            ) : main ? <Tile t={main} fit="contain" big /> : <Empty>{c.lk.noTeacherVideo}</Empty>}
          </div>
          {!focus && strip.length > 0 && (
            <div className="flex shrink-0 gap-2 overflow-x-auto md:w-48 md:flex-col md:overflow-y-auto landscape:w-32 landscape:flex-col landscape:overflow-x-hidden landscape:overflow-y-auto md:landscape:w-48">
              {strip.map((t) => {
                const tall = roleOf(t.participant) === "teacher"; // tutor camera is sent as a 9:16 frame from phones
                return (
                  <div key={`${t.participant.identity}-${t.source}`} className={`relative shrink-0 overflow-hidden rounded-lg bg-black/40 md:w-full landscape:w-full ${tall ? "aspect-[9/16] w-24 md:aspect-[3/4]" : "aspect-video w-40"}`}>
                    <Tile t={t} fit="cover" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {chatOpen && !focus && <ChatPanel chat={chat} />}
        {role === "teacher" && (composing ? <PollComposer polls={polls} onClose={() => setComposing(false)} /> : <PollLive polls={polls} students={participants.filter((p) => !p.isLocal && roleOf(p) === "student").length} />)}
        {role === "student" && <PollAnswer polls={polls} />}
      </div>

      <Controls
        role={role} chatOpen={chatOpen} unread={unread} toggleChat={() => setChatOpen((v) => !v)}
        fs={fs} toggleFs={toggleFs}
        hasScreen={!!screen} screenOnly={screenOnly} toggleScreenOnly={() => setScreenOnly((v) => !v)}
        pollBusy={composing || !!polls.active} openPoll={() => setComposing(true)}
        board={board}
        toggleBoard={() => {
          if (board) { void saveBoard.current?.().then(() => setBoard(false)); return; }
          setBoard(true);
          if (isTouchDevice()) void landscape();
        }}
        beforeLeave={async () => { if (board) await saveBoard.current?.(); }}
      />
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

function Controls(props: {
  role: Role; chatOpen: boolean; unread: number; toggleChat: () => void;
  fs: boolean; toggleFs: () => void; hasScreen: boolean; screenOnly: boolean; toggleScreenOnly: () => void;
  pollBusy: boolean; openPoll: () => void;
  board: boolean; toggleBoard: () => void; beforeLeave: () => Promise<void>;
}) {
  const { role, chatOpen, unread, toggleChat } = props;
  const lang = useLang();
  const c = copy(useLang()).room;
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const mic = useTrackToggle({ source: Track.Source.Microphone });
  const cam = useTrackToggle({ source: Track.Source.Camera });
  const scr = useTrackToggle({ source: Track.Source.ScreenShare, captureOptions: { audio: true, resolution: VideoPresets.h1080.resolution } });
  const handUp = localParticipant.attributes?.hand === "1";
  // Phones can't share their screen; they use the PDF board instead.
  const [canShare, setCanShare] = useState(false);
  useEffect(() => { setCanShare(!!navigator.mediaDevices?.getDisplayMedia && !isTouchDevice()); }, []);
  const [leaving, setLeaving] = useState(false);

  const btn = (on: boolean) => `rounded-lg px-3 py-2 text-sm font-semibold sm:px-4 short:py-1.5 ${on ? "bg-white/15 hover:bg-white/25" : "bg-white text-board"}`;
  return (
    <div className="flex flex-wrap justify-center gap-2 p-3 sm:gap-3 sm:p-4 short:gap-1.5 short:p-1.5">
      <button disabled={mic.pending} onClick={() => mic.toggle()} className={btn(mic.enabled)}>{mic.enabled ? c.lk.mic : c.lk.micOff}</button>
      <button disabled={cam.pending} onClick={() => cam.toggle()} className={btn(cam.enabled)}>{cam.enabled ? c.lk.cam : c.lk.camOff}</button>
      {role === "teacher" && (
        <button onClick={props.toggleBoard} className={props.board ? "rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-board sm:px-4 short:py-1.5" : btn(true)}>
          {props.board ? toolsCopy(lang).board.close : toolsCopy(lang).board.open}
        </button>
      )}
      {role === "teacher" && canShare && !props.board && (
        <button disabled={scr.pending} onClick={() => scr.toggle()} className={scr.enabled ? "rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-board sm:px-4" : btn(true)}>
          {scr.enabled ? c.lk.screenOff : c.lk.screen}
        </button>
      )}
      {role === "student" && (
        <button onClick={() => localParticipant.setAttributes({ ...localParticipant.attributes, hand: handUp ? "0" : "1" })} className={handUp ? "rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-board sm:px-4" : btn(true)}>
          {handUp ? c.lk.handDown : c.lk.hand}
        </button>
      )}
      <button onClick={toggleChat} className={`relative ${chatOpen ? "rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-board sm:px-4" : btn(true)}`}>
        {c.lk.chat}
        {unread > 0 && <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-redpen px-1.5 text-xs leading-5 text-white">{L.num(String(unread), lang)}</span>}
      </button>
      {role === "teacher" && <button disabled={props.pollBusy} onClick={props.openPoll} className={`${btn(true)} disabled:opacity-50`}>{c.poll.btn}</button>}
      {role === "student" && props.hasScreen && (
        <button onClick={props.toggleScreenOnly} className={props.screenOnly ? "rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-board sm:px-4" : btn(true)}>
          {props.screenOnly ? c.lk.screenAll : c.lk.screenOnly}
        </button>
      )}
      <button onClick={props.toggleFs} aria-label={props.fs ? c.lk.fullExit : c.lk.full} title={props.fs ? c.lk.fullExit : c.lk.full} className={btn(true)}>{props.fs ? "⤡" : "⛶"}<span className="ml-1.5 hidden sm:inline">{props.fs ? c.lk.fullExit : c.lk.full}</span></button>
      <button disabled={leaving} onClick={async () => { setLeaving(true); await props.beforeLeave().catch(() => {}); void room.disconnect(); }} className="rounded-lg bg-redpen px-3 py-2 text-sm font-semibold text-white sm:px-4 short:py-1.5 disabled:opacity-60">{c.leave}</button>
    </div>
  );
}

function ChatPanel({ chat }: { chat: ReturnType<typeof useChat> }) {
  const lang = useLang();
  const c = copy(lang).room.lk;
  const { send, chatMessages, isSending } = chat;
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [chatMessages.length]);
  const fmt = useMemo(() => new Intl.DateTimeFormat(lang === "bn" ? "bn-BD" : "en-GB", { hour: "numeric", minute: "2-digit", hour12: false, timeZone: "Asia/Dhaka" }), [lang]);

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
