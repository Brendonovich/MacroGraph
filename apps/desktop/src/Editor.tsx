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
import { open } from "@tauri-apps/api/dialog";
import { convertFileSrc, invoke } from "@tauri-apps/api/tauri";
import { Show, createSignal, onMount } from "solid-js";
import "tauri-plugin-midi";

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

invoke<Array<{ device_id: string; label: string }>>(
  "enumerate_audio_outputs",
)
  .then((devices) =>
    setAudioDevices(devices.map((d) => ({ deviceId: d.device_id, label: d.label }))),
  )
  .catch(() => {});

const audioBackend: pkgs.audio.AudioBackend = {
  play: (path, deviceName) =>
    invoke("play_audio", { path, deviceName }).then((r: any) => r.id),
  stop: (id) => invoke("stop_audio", { id }),
  setVolume: (id, volume) => invoke("set_audio_volume", { id, volume }),
  stopAll: () => invoke("stop_all_audio"),
  onStopped: {
    listen: (cb) => {
      let unlisten: (() => void) | undefined;
      import("@tauri-apps/api/event").then(({ listen }) => {
        listen<string>("audio-stopped", (event) => {
          cb(event.payload);
        }).then((u) => { unlisten = u; });
      });
      return () => unlisten?.();
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
        open({
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
  // pkgs.google.pkg,
  pkgs.http.pkg,
  pkgs.json.pkg,
  pkgs.keyboard.pkg,
  pkgs.list.pkg,
  pkgs.localStorage.pkg,
  pkgs.logic.pkg,
  pkgs.map.pkg,
  () => pkgs.obs.pkg({ obsNative: obsNativeBridge }),
  // pkgs.patreon.pkg,
  // pkgs.spotify.pkg,
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
  () => pkgs.websocketServer.pkg(wsProvider),
  pkgs.globalKeyboardMouse.pkg,
  pkgs.midi.pkg,
  pkgs.elevenlabs.pkg,
  pkgs.vtubeStudio.pkg,
  pkgs.voicemod.pkg,
  pkgs.functions.pkg,
  pkgs.functionQueue.pkg,
  pkgs.script.pkg,
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
