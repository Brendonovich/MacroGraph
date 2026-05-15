import {
  ConfigDialog,
  ConnectionsDialog,
  Interface,
  PlatformContext,
  importInvocationLogFromProject,
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
  pkgs.customEvents.pkg,
  pkgs.speakerbot.pkg,
  () => pkgs.websocketServer.pkg(wsProvider),
  pkgs.globalKeyboardMouse.pkg,
  pkgs.midi.pkg,
  pkgs.elevenlabs.pkg,
  pkgs.vtubeStudio.pkg,
  pkgs.voicemod.pkg,
].map((p) => core.registerPackage(p));

export default function Editor() {
  const [loaded, setLoaded] = createSignal(false);

  onMount(() => {
    const savedProject = localStorage.getItem("project");
    const savedProjectRoot = localStorage.getItem("project-root");

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

      const merged = {
        ...serializedProjectRoot,
        graphs,
        variables,
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
        />
      </PlatformContext.Provider>
    </Show>
  );
}

export function MenuItems() {
  return (
    <>
      <ConnectionsDialog core={core} />
      <ConfigDialog />
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
