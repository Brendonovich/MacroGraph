import { Some } from "@macrograph/option";
import { Button, Input } from "@macrograph/ui";
import { For, Match, Switch, createEffect, createSignal } from "solid-js";
import { AVAILABLE_MODELS, getModel } from "./modelRegistry";
import type { Ctx } from "./ctx";

export default function (props: Ctx & { capture: any }) {
  const [cachedNames, setCachedNames] = createSignal<string[]>([]);
  const [micError, setMicError] = createSignal<string | null>(null);
  const [backendAvailable, setBackendAvailable] = createSignal(true);
  const [isDownloading, setIsDownloading] = createSignal(false);

  const selModel = () => props.selectedModel().unwrapOr("base.en");
  const isCached = () => cachedNames().includes(selModel());
  const capturing = () => !!props.status().isCapturing;
  const modelInfo = () => getModel(selModel());
  const dlProgress = () => props.downloadProgress();

  async function refreshCachedModels() {
    try {
      const models: Array<{ name: string }> =
        await window.electronAPI.stt.getCachedModels();
      setCachedNames(models.map((m) => m.name));
    } catch {
      setCachedNames([]);
    }
  }

  createEffect(() => {
    refreshCachedModels();
    window.electronAPI.stt
      .isBackendAvailable()
      .then(setBackendAvailable)
      .catch(() => setBackendAvailable(false));

    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        const inputs = devices
          .filter((d) => d.kind === "audioinput")
          .map((d, i) => ({
            deviceId: d.deviceId,
            label: d.label || `Microphone ${i + 1}`,
          }));

        if (inputs.every((d) => !d.label)) {
          navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((s) => s.getTracks().forEach((t) => t.stop()))
            .catch(() => setMicError("Microphone access denied"))
            .then(() => navigator.mediaDevices.enumerateDevices())
            .then((refreshed) => {
              props.setMicList(
                refreshed
                  .filter((d) => d.kind === "audioinput")
                  .map((d, i) => ({
                    deviceId: d.deviceId,
                    label: d.label || `Microphone ${i + 1}`,
                  })),
              );
            });
        } else {
          props.setMicList(inputs);
        }
      })
      .catch(() => props.setMicList([]));
  });

  async function handleDownload() {
    const name = selModel();
    setIsDownloading(true);
    try {
      await window.electronAPI.stt.downloadModel(name);
      refreshCachedModels();
    } catch (err: any) {
      console.error("Download failed:", err?.message ?? err);
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleStart() {
    const micId = props.selectedMic().unwrapOr("");
    const modelName = selModel();
    await window.electronAPI.stt.loadModel(modelName);
    await props.capture.start(micId);
    const s = await window.electronAPI.stt.getStatus();
    props.setStatus(s);
  }

  function handleStop() {
    props.capture.stop();
    window.electronAPI.stt.unloadModel();
    window.electronAPI.stt.getStatus().then(props.setStatus);
  }

  return (
    <div class="flex flex-col space-y-4">
      <span class="text-neutral-300 font-semibold text-lg">
        Speech to Text
      </span>

      <Switch>
        <Match when={!backendAvailable()}>
          <div class="bg-yellow-900/40 border border-yellow-700 rounded px-3 py-2 text-xs text-yellow-300">
            Transcoder binary not found. Run <code>pnpm build:whisper</code> in apps/desktop.
          </div>
        </Match>
      </Switch>

      <div class="flex flex-col space-y-2">
        <span class="text-neutral-400 text-sm font-medium">Model</span>

        <div class="flex flex-row space-x-2 items-start">
          <div class="flex flex-col flex-1 space-y-1">
            <select
              class="bg-neutral-800 text-white rounded px-3 py-1.5 text-sm"
              value={selModel()}
              onChange={(e) =>
                props.setSelectedModel(Some(e.currentTarget.value))
              }
              disabled={isDownloading() || capturing()}
            >
              <For each={AVAILABLE_MODELS}>
                {(model) => (
                  <option value={model.name}>{model.label}</option>
                )}
              </For>
            </select>

            {modelInfo() !== undefined && (
              <span class="text-xs text-neutral-500">
                {modelInfo()?.size} RAM {modelInfo()?.ram} Latency{" "}
                {modelInfo()?.latency} {modelInfo()?.quality} quality
              </span>
            )}
          </div>

          <Switch>
            <Match when={isDownloading()}>
              <div class="flex items-center pt-1.5">
                <span class="text-xs text-blue-400 animate-pulse">
                  Downloading...
                </span>
              </div>
            </Match>
            <Match when={!isCached()}>
              <Button onClick={handleDownload} size="sm" class="mt-1.5">
                Download
              </Button>
            </Match>
            <Match when={isCached()}>
              <div class="flex items-center space-x-1.5 pt-1.5">
                <span class="text-xs text-green-400">Downloaded</span>
                <Button
                  onClick={handleDownload}
                  size="sm"
                  variant="outline"
                >
                  Re-download
                </Button>
              </div>
            </Match>
          </Switch>
        </div>

        <Switch>
          <Match
            when={
              isDownloading() && dlProgress() !== null && dlProgress()!.total > 0
            }
          >
            <div class="pt-1">
              <div class="w-full bg-neutral-700 rounded-full h-2 overflow-hidden">
                <div
                  class="bg-blue-500 h-full rounded-full transition-all duration-200 ease-out"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        ((dlProgress()?.loaded ?? 0) /
                          (dlProgress()?.total ?? 1)) *
                          100,
                      ),
                    )}%`,
                  }}
                />
              </div>
              <div class="flex justify-between text-xs text-neutral-400 mt-1">
                <span>
                  {((dlProgress()?.loaded ?? 0) >= 1e6
                    ? `${((dlProgress()?.loaded ?? 0) / 1e6).toFixed(1)} MB`
                    : `${((dlProgress()?.loaded ?? 0) / 1024).toFixed(0)} KB`
                  ).toString() + " / " + (dlProgress()?.total && dlProgress()!.total >= 1e6
                    ? `${(dlProgress()!.total / 1e6).toFixed(1)} MB`
                    : `${((dlProgress()?.total ?? 0) / 1024).toFixed(0)} KB`
                  ).toString()}
                </span>
                <span>
                  {Math.round(
                    ((dlProgress()?.loaded ?? 0) /
                      (dlProgress()?.total ?? 1)) *
                      100,
                  )}
                  %
                </span>
              </div>
            </div>
          </Match>
        </Switch>

        <Switch>
          <Match when={props.status().error}>
            <div class="bg-red-900/40 border border-red-700 rounded px-3 py-2 text-xs text-red-300 mt-2">
              {props.status().error}
            </div>
          </Match>
        </Switch>
      </div>

      <div class="flex flex-col space-y-1">
        <span class="text-neutral-400 text-sm font-medium">Microphone</span>
        <Switch>
          <Match when={micError() !== null}>
            <div class="bg-yellow-900/40 border border-yellow-700 rounded px-3 py-1.5 text-xs text-yellow-300">
              {micError()} - grant mic access in your system settings.
            </div>
          </Match>
        </Switch>
        <Switch>
          <Match when={props.micList().length > 0}>
            <select
              class="bg-neutral-800 text-white rounded px-3 py-1.5 text-sm"
              value={props.selectedMic().unwrapOr("")}
              disabled={capturing()}
              onChange={(e) => {
                const val = e.currentTarget.value;
                props.setSelectedMic(Some(val));
                const mic = props.micList().find((m) => m.deviceId === val);
                if (mic) props.setSelectedMicLabel(Some(mic.label));
              }}
            >
              <option value="">Default Microphone</option>
              <For each={props.micList()}>
                {(mic) => (
                  <option value={mic.deviceId}>{mic.label}</option>
                )}
              </For>
            </select>
          </Match>
          <Match when={props.micList().length === 0}>
            <div class="bg-neutral-800 text-neutral-400 rounded px-3 py-1.5 text-sm">
              Loading microphones...
            </div>
          </Match>
        </Switch>
      </div>

      <div class="flex flex-col space-y-1">
        <span class="text-neutral-400 text-sm font-medium">
          Max Chunk Duration
        </span>
        <div class="flex flex-row space-x-2 items-center">
          <Input
            type="number"
            min={1}
            max={60}
            step={0.5}
            value={props.captureSettings().maxDurationSecs}
            disabled={capturing()}
            onInput={(e) =>
              props.setCaptureSettings((s) => ({
                ...s,
                maxDurationSecs: parseFloat(e.currentTarget.value) || 5,
              }))
            }
          />
          <span class="text-xs text-neutral-400">seconds</span>
        </div>
        <span class="text-xs text-neutral-500">
          Max seconds per chunk. Longer = more context, higher latency.
        </span>
      </div>

      <div class="flex flex-col space-y-1">
        <span class="text-neutral-400 text-sm font-medium">
          Chunk Overlap
        </span>
        <div class="flex flex-row space-x-2 items-center">
          <Input
            type="number"
            min={0}
            max={5}
            step={0.1}
            value={props.captureSettings().overlapSecs}
            disabled={capturing()}
            onInput={(e) =>
              props.setCaptureSettings((s) => ({
                ...s,
                overlapSecs: parseFloat(e.currentTarget.value) || 1,
              }))
            }
          />
          <span class="text-xs text-neutral-400">seconds</span>
        </div>
        <span class="text-xs text-neutral-500">
          Overlap retained between chunks so words at boundaries aren't cut.
        </span>
      </div>

      <div class="flex flex-row space-x-3 pt-2 items-center">
        <Button
          onClick={handleStart}
          disabled={!isCached() || capturing() || !backendAvailable() || props.status().isCapturing === "starting"}
        >
          {props.status().isCapturing === "starting"
            ? "Starting..."
            : props.status().isCapturing === true
              ? "Capturing..."
              : props.status().modelLoaded
                ? "Start Capture"
                : "Load & Start Capture"}
        </Button>
        <Button
          onClick={handleStop}
          disabled={!capturing()}
          variant="destructive"
        >
          Stop
        </Button>

        <Switch>
          <Match when={!isCached()}>
            <span class="text-xs text-neutral-500">
              Download a model first
            </span>
          </Match>
        </Switch>
      </div>

      <div class="flex flex-col space-y-1 pt-2 border-t border-neutral-700">
        <span class="text-neutral-400 text-sm font-medium">
          Recent Transcript
        </span>
        <div class="bg-neutral-900 rounded p-2 min-h-[60px] max-h-[120px] overflow-y-auto">
          <Switch>
            <Match when={props.recentTranscript() === null}>
              <span class="text-neutral-600 text-xs italic">
                No speech detected yet
              </span>
            </Match>
            <Match when={props.recentTranscript() !== null}>
              <span class="text-white text-sm whitespace-pre-wrap">
                {props.recentTranscript()}
              </span>
            </Match>
          </Switch>
        </div>
      </div>
    </div>
  );
}
