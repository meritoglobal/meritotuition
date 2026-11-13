"use client";
import type { Track, TrackProcessor, VideoProcessorOptions } from "livekit-client";

/**
 * Crops the camera to a 9:16 portrait frame before it is sent.
 * A tutor can lay the phone sideways on the desk (so the PDF board is wide)
 * and still appear as a tall "reel-style" tile to students and in the recording.
 */
export const PORTRAIT_W = 540;
export const PORTRAIT_H = 960;

type VideoWithRvfc = HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number; cancelVideoFrameCallback?: (h: number) => void };

export function portraitProcessor(): TrackProcessor<Track.Kind.Video, VideoProcessorOptions> {
  let video: VideoWithRvfc | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let rvfc: number | null = null;

  const p: TrackProcessor<Track.Kind.Video, VideoProcessorOptions> = {
    name: "mm-portrait",
    async init(opts) {
      stopped = false;
      video = document.createElement("video") as VideoWithRvfc;
      video.muted = true;
      video.playsInline = true;
      video.srcObject = new MediaStream([opts.track]);
      canvas = document.createElement("canvas");
      canvas.width = PORTRAIT_W;
      canvas.height = PORTRAIT_H;
      const ctx = canvas.getContext("2d")!;
      await video.play().catch(() => {});
      const draw = () => {
        if (stopped || !video || !canvas) return;
        const vw = video.videoWidth, vh = video.videoHeight;
        if (vw && vh) {
          // Centre-crop whatever the camera gives (landscape or portrait) to 9:16.
          const target = PORTRAIT_W / PORTRAIT_H;
          let sw = vw, sh = vh;
          if (vw / vh > target) sw = vh * target; else sh = vw / target;
          ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, PORTRAIT_W, PORTRAIT_H);
        }
        if (video.requestVideoFrameCallback) rvfc = video.requestVideoFrameCallback(draw);
        else timer = setTimeout(draw, 1000 / 24);
      };
      draw();
      p.processedTrack = canvas.captureStream(24).getVideoTracks()[0];
    },
    async restart(opts) {
      await p.destroy();
      await p.init(opts);
    },
    async destroy() {
      stopped = true;
      if (timer) clearTimeout(timer);
      if (rvfc !== null && video?.cancelVideoFrameCallback) video.cancelVideoFrameCallback(rvfc);
      p.processedTrack?.stop();
      if (video) video.srcObject = null;
      video = null;
      canvas = null;
    },
  };
  return p;
}

/** Phones and tablets: touch-first devices get the portrait camera. */
export const isTouchDevice = () => typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
