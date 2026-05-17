import {
	ConfigDialog,
	Interface,
	PlatformContext,
	importInvocationLogFromProject,
	setCursorBroadcastFn,
	setPinDragBroadcastFn,
	setSelectionBoxBroadcastFn,
	type WireGraphPositionsEphemeral,
} from "@macrograph/interface";
import * as pkgs from "@macrograph/packages";
import { deserializeProject, parseJsonWithContext, serde, serializeProject } from "@macrograph/runtime-serde";
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

    const savedProject = localStorage.getItem("project");
    let savedProjectRoot = localStorage.getItem("project-root");

    if (savedProject) {
      const serializedProject = parseJsonWithContext(
        "apps/desktop Editor onMount: localStorage key `project` (inline project JSON)",
        serde.Project,
        savedProject,
      );
      core
        .load((c) => deserializeProject(c, serializedProject))
        .then(() =>
          importInvocationLogFromProject(
            serializedProject.nodeInvocations,
            projectUrl() ?? "default",
          ),
        )
        .finally(() => {
          setLoaded(true);
        });
    } else if (savedProjectRoot) {
      // migrate from old sharded format to unified project key
      // Repair any existing data where functionGraphs/queueGraphs/functionQueueGraphs
      // contain full graph objects instead of IDs (from a previous save bug).
      // Extract the objects into sharded keys, then replace with IDs.
      try {
        const parsed = JSON.parse(savedProjectRoot) as Record<string, unknown>;
        let repaired = false;
        const graphKeys: Record<string, string> = {
          functionGraphs: "project-function-graph-",
          queueGraphs: "project-queue-graph-",
          functionQueueGraphs: "project-function-queue-graph-",
        };
        for (const [key, prefix] of Object.entries(graphKeys)) {
          const arr = parsed[key];
          if (Array.isArray(arr) && arr.length > 0 && typeof arr[0] === "object") {
            for (const g of arr as Array<Record<string, unknown>>) {
              localStorage.setItem(`${prefix}${g.id}`, JSON.stringify(g));
            }
            parsed[key] = (arr as Array<Record<string, unknown>>).map((g) => g.id);
            repaired = true;
          }
        }
        if (repaired) {
          localStorage.setItem("project-root", JSON.stringify(parsed));
          savedProjectRoot = JSON.stringify(parsed);
        }
      } catch { /* ignore */ }

      const serializedProjectRoot = parseJsonWithContext(
        "apps/desktop Editor onMount: localStorage key `project-root`",
        serde.ProjectRoot,
        savedProjectRoot,
      );

      const graphs: serde.Graph[] = [];

      for (const graphId of serializedProjectRoot.graphs) {
        const data = localStorage.getItem(`project-graph-${graphId}`);
        if (!data) throw new Error(`Graph ${graphId} not found`);
        const graph = parseJsonWithContext(
          `apps/desktop Editor onMount: localStorage key project-graph-${graphId}`,
          serde.Graph,
          data,
        );
        graphs.push(graph);
      }

      const variables: serde.Variable[] = [];

      for (const variableId of serializedProjectRoot.variables) {
        const data = localStorage.getItem(`project-variable-${variableId}`);
        if (!data) throw new Error(`Variable ${variableId} not found`);
        const variable = parseJsonWithContext(
          `apps/desktop Editor onMount: localStorage key project-variable-${variableId}`,
          serde.Variable,
          data,
        );
        variables.push(variable);
      }

      const queues: serde.Queue[] = [];

      for (const queueId of serializedProjectRoot.queues ?? []) {
        const data = localStorage.getItem(`project-queue-${queueId}`);
        if (!data) throw new Error(`Queue ${queueId} not found`);
        const queue = parseJsonWithContext(
          `apps/desktop Editor onMount: localStorage key project-queue-${queueId}`,
          serde.Queue,
          data,
        );
        queues.push(queue);
      }

      const root = serializedProjectRoot as any;

      const functionGraphs: serde.Graph[] = [];

      for (const graphId of (root.functionGraphs as number[]) ?? []) {
        const data = localStorage.getItem(`project-function-graph-${graphId}`);
        if (!data) continue;
        const graph = parseJsonWithContext(
          `apps/desktop Editor onMount: localStorage key project-function-graph-${graphId}`,
          serde.Graph,
          data,
        );
        functionGraphs.push(graph);
      }

      const queueGraphs: serde.Graph[] = [];

      for (const graphId of (root.queueGraphs as number[]) ?? []) {
        const data = localStorage.getItem(`project-queue-graph-${graphId}`);
        if (!data) continue;
        const graph = parseJsonWithContext(
          `apps/desktop Editor onMount: localStorage key project-queue-graph-${graphId}`,
          serde.Graph,
          data,
        );
        queueGraphs.push(graph);
      }

      const functionQueueGraphs: serde.Graph[] = [];

      for (const graphId of (root.functionQueueGraphs as number[]) ?? []) {
        const data = localStorage.getItem(`project-function-queue-graph-${graphId}`);
        if (!data) continue;
        const graph = parseJsonWithContext(
          `apps/desktop Editor onMount: localStorage key project-function-queue-graph-${graphId}`,
          serde.Graph,
          data,
        );
        functionQueueGraphs.push(graph);
      }

      const merged = {
        ...root,
        graphs,
        functionGraphs,
        queueGraphs,
        functionQueueGraphs,
        variables: variables as any,
        queues,
      };
      core
        .load((c) => deserializeProject(c, merged))
        .then(() =>
          importInvocationLogFromProject(
            merged.nodeInvocations,
            projectUrl() ?? "default",
          ),
        )
        .finally(() => {
          // save as unified format and clean up old sharded keys
          const serialized = serializeProject(core.project);
          // restore nodeInvocations from merged since serializeProject doesn't include them
          localStorage.setItem(
            "project",
            JSON.stringify({ ...serialized, nodeInvocations: merged.nodeInvocations ?? [] }),
          );
          localStorage.removeItem("project-root");
          for (const key of Object.keys(localStorage)) {
            if (
              key.startsWith("project-graph-") ||
              key.startsWith("project-function-graph-") ||
              key.startsWith("project-queue-graph-") ||
              key.startsWith("project-function-queue-graph-") ||
              key.startsWith("project-queue-") ||
              key.startsWith("project-variable-")
            ) {
              localStorage.removeItem(key);
            }
          }
          setLoaded(true);
        });
    } else {
      setLoaded(true);
    }
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
