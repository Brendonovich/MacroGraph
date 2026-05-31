import {
	ConfigDialog,
	KeyboardShortcutsDialog,
	Interface,
	LoadCheckerDialog,
	PlatformContext,
	config,
	importInvocationLogFromProject,
	ensureEditorStorageMigrated,
	loadParsedProject,
	loadProjectJson,
	setCursorBroadcastFn,
	setPinDragBroadcastFn,
	setSelectionBoxBroadcastFn,
	type WireGraphPositionsEphemeral,
} from "@macrograph/interface";
import * as pkgs from "@macrograph/packages";
import { parseJsonWithContext, serde } from "@macrograph/runtime-serde";
import { makePersisted } from "@solid-primitives/storage";
import { Show, createSignal, onMount } from "solid-js";

import { Button } from "@macrograph/ui";
import "./app.css";
import { core, wsProvider } from "./core";
import { obsNativeBridge, outboundWsBridge } from "./nativeBridges";
import { createPlatform } from "./platform";
import { RemoteHostDialog } from "./RemoteHostDialog";
import {
	broadcastRemoteHostGraphPositionsLive,
	broadcastRemoteHostHistoryActions,
	broadcastRemoteHostCursorPosition,
	broadcastRemoteHostPinDrag,
	broadcastRemoteHostSelectionBox,
	installRemoteHostBridge,
	setHostGraphLivePointerSession,
} from "./remoteHostBridge";
import { client } from "./rspc";

const [projectUrl, setProjectUrl] = makePersisted(
  createSignal<string | null>(null),
  { name: "currentProjectUrl" },
);

const platform = createPlatform({
  projectUrl,
  setProjectUrl,
  core,
});

const [audioDevices, setAudioDevices] = createSignal<
  Array<{ deviceId: string; label: string }>
>([]);

navigator.mediaDevices.enumerateDevices().then((devices) =>
  setAudioDevices(
    devices
      .filter((d) => d.kind === "audiooutput")
      .map((d) => ({ deviceId: d.deviceId, label: d.label })),
  ),
).catch(() => {});

const audioCtx = new AudioContext();
function ensureAudioCtx() {
  if (audioCtx.state === "suspended") audioCtx.resume();
}
const audioPlayers = new Map<
  string,
  { source: AudioBufferSourceNode; gain: GainNode }
>();
let onAudioStopped: ((id: string) => void) | null = null;

const audioBackend: pkgs.audio.AudioBackend = {
  play: async (path, deviceName) => {
    ensureAudioCtx();
    const id = crypto.randomUUID();

    const data = await window.electronAPI.fs.readBinaryFile(path);
    const buffer = await audioCtx.decodeAudioData(
      new Uint8Array(data).buffer,
    );

    if (deviceName && typeof (audioCtx as any).setSinkId === "function") {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const device = devices.find(
        (d) => d.label === deviceName || d.deviceId === deviceName,
      );
      if (device) {
        try {
          await (audioCtx as any).setSinkId(device.deviceId);
        } catch {}
      }
    }

    const source = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(audioCtx.destination);
    source.start();
    source.onended = () => {
      audioPlayers.delete(id);
      onAudioStopped?.(id);
    };
    audioPlayers.set(id, { source, gain });
    return id;
  },
  stop: async (id) => {
    const player = audioPlayers.get(id);
    if (player) {
      player.source.stop();
      audioPlayers.delete(id);
    }
  },
  setVolume: async (id, volume) => {
    const player = audioPlayers.get(id);
    if (player) player.gain.gain.value = volume;
  },
  stopAll: async () => {
    for (const [, player] of audioPlayers) player.source.stop();
    audioPlayers.clear();
  },
  onStopped: {
    listen: (cb) => {
      onAudioStopped = cb;
      return () => {
        onAudioStopped = null;
      };
    },
  },
};

[
  () =>
    pkgs.audio.pkg({
      prepareURL: (url: string) => url,
      getDeviceName: () => config.audio.outputDeviceLabel,
      backend: audioBackend,
      selectFile: () =>
        window.electronAPI.dialog.open({
          filters: [
            {
              name: "Audio Files",
              extensions: [
                "mp3", "wav", "ogg", "aac", "flac", "wma",
                "m4a", "opus", "webm",
              ],
            },
            { name: "All Files", extensions: ["*"] },
          ],
          multiple: false,
        }).then((r) => (typeof r === "string" ? r : null)),
    }),
  pkgs.discord.pkg,
  () =>
    pkgs.fs.register({
      list: (path) => client.query(["fs.list", path]),
    }),
  pkgs.github.pkg,
  pkgs.goxlr.pkg,
  pkgs.http.pkg,
  pkgs.json.pkg,
  pkgs.keyboard.pkg,
  pkgs.list.pkg,
  pkgs.localStorage.pkg,
  pkgs.logic.pkg,
  pkgs.map.pkg,
  () => pkgs.obs.pkg({ obsNative: obsNativeBridge }),
  () => pkgs.streamdeck.pkg(wsProvider),
  pkgs.streamlabs.pkg,
  () =>
    pkgs.shell.pkg(async (path) => {
      await client.mutation(["shell.execute", path]);
    }),
  pkgs.twitch.pkg,
  pkgs.utils.pkg,
  pkgs.openai.pkg,
  () => pkgs.websocket.pkg({ outboundWs: outboundWsBridge }),
  pkgs.variables.pkg,
  pkgs.queue.pkg,
  pkgs.customEvents.pkg,
	pkgs.speakerbot.pkg,
	pkgs.tiktok.pkg,
	() => pkgs.websocketServer.pkg(wsProvider),
  pkgs.globalKeyboardMouse.pkg,
  pkgs.midi.pkg,
  pkgs.elevenlabs.pkg,
  pkgs.vtubeStudio.pkg,
  pkgs.voicemod.pkg,
  pkgs.functions.pkg,
  pkgs.functionQueue.pkg,
  pkgs.script.pkg,
  pkgs.ikea.pkg,
].map((p) => core.registerPackage(p));

export default function Editor() {
  const [loaded, setLoaded] = createSignal(false);

  /** Must not run in render: mutable `core` can re-run this component on graph edits, which would
   *  tear down `remoteHost.server` and reconnect every remote client (full `project` snapshot). */
  onMount(() => {
    setCursorBroadcastFn(broadcastRemoteHostCursorPosition);
    setPinDragBroadcastFn(broadcastRemoteHostPinDrag);
    setSelectionBoxBroadcastFn(broadcastRemoteHostSelectionBox);
    installRemoteHostBridge({ core, projectUrl });

    void (async () => {
      await ensureEditorStorageMigrated();

      const workspaceKey = projectUrl() ?? "default";
      const savedProject = await loadProjectJson(workspaceKey);

      if (savedProject) {
        const serializedProject = parseJsonWithContext(
          "apps/desktop Editor onMount: IndexedDB project",
          serde.Project,
          savedProject,
        );
        await loadParsedProject(core, serializedProject, {
          onAfterLoad: async (data) => {
            await importInvocationLogFromProject(
              data.nodeInvocations,
              workspaceKey,
            );
          },
        });
      } else {
        await core.finalizeProjectSetup();
      }

      setLoaded(true);
    })();
  });

  return (
    <>
      <LoadCheckerDialog />
      <Show when={loaded() && core.project} keyed>
      <PlatformContext.Provider value={platform}>
        <Interface
          core={core}
          environment="custom"
          mosaicWorkspaceKey={projectUrl}
          broadcastHistoryCommit={broadcastRemoteHostHistoryActions}
          broadcastGraphPositionsLive={(p: WireGraphPositionsEphemeral) =>
            broadcastRemoteHostGraphPositionsLive(p, null)
          }
          onGraphLivePointerSession={setHostGraphLivePointerSession}
          broadcastCursorPosition={broadcastRemoteHostCursorPosition}
        />
      </PlatformContext.Provider>
    </Show>
    </>
  );
}

export function MenuItems() {
  return (
    <>
      <KeyboardShortcutsDialog />
      <ConfigDialog audioDevices={audioDevices()} />
      <RemoteHostDialog />
      <Button
        title="Save Project"
        size="icon"
        variant="ghost"
        onClick={(e) => platform.projectPersistence.saveProject(e.shiftKey)}
      >
        <IconFaSolidSave class="size-5" />
      </Button>
      <Button
        title="Load Project"
        size="icon"
        variant="ghost"
        onClick={() => platform.projectPersistence.loadProject()}
      >
        <IconTdesignFolderImport class="size-5" />
      </Button>
    </>
  );
}
