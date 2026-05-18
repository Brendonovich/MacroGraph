import {
	ConfigDialog,
	Interface,
	PlatformContext,
	importInvocationLogFromProject,
	ensureEditorStorageMigrated,
	loadProjectJson,
	setCursorBroadcastFn,
	setPinDragBroadcastFn,
	setSelectionBoxBroadcastFn,
	type WireGraphPositionsEphemeral,
} from "@macrograph/interface";
import * as pkgs from "@macrograph/packages";
import { deserializeProject, parseJsonWithContext, serde } from "@macrograph/runtime-serde";
import { makePersisted } from "@solid-primitives/storage";
import { convertFileSrc } from "@tauri-apps/api/tauri";
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

[
  () =>
    pkgs.audio.pkg({
      prepareURL: (url: string) => convertFileSrc(url),
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
        await core.load((c) => deserializeProject(c, serializedProject));
        await importInvocationLogFromProject(
          serializedProject.nodeInvocations,
          workspaceKey,
        );
      }

      setLoaded(true);
    })();
  });

  return (
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
  );
}

export function MenuItems() {
  return (
    <>
      <ConfigDialog />
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
