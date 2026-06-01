import { Package } from "@macrograph/runtime";
import { onCleanup } from "solid-js";
import { createCtx } from "./ctx";
import { CaptureManager } from "./runtime/capture";
import * as nodes from "./nodes/speechToText";

export type Pkg = ReturnType<typeof pkg>;

type Events = {
  speech: { text: string; confidence: number; isFinal: boolean };
};

export function pkg() {
  const ctx = createCtx();
  const capture = new CaptureManager(ctx);

  const unsubTranscription = window.electronAPI.onEvent(
    "stt:transcription",
    (data: any) => {
      pkg.emitEvent({ name: "speech", data });
      ctx.setRecentTranscript(data.text);
    },
  );

  const unsubError = window.electronAPI.onEvent(
    "stt:error",
    (error: string | null) => {
      ctx.setStatus((s) => ({ ...s, error }));
      if (error) ctx.setStatus((s) => ({ ...s, isCapturing: false }));
    },
  );

  const unsubProgress = window.electronAPI.onEvent(
    "stt:downloadProgress",
    (progress: any) => {
      if (progress.done) ctx.setDownloadProgress(null);
      else ctx.setDownloadProgress(progress);
    },
  );

  onCleanup(() => {
    capture.cleanup();
    unsubTranscription();
    unsubError();
    unsubProgress();
  });

  const pkg = new Package<Events>({
    name: "Speech to Text",
    ctx: { ...ctx, capture },
    SettingsUI: () => import("./Settings"),
  });

  nodes.register(pkg);

  return pkg;
}
