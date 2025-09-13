import {
  ConfigDialog,
  ConnectionsDialog,
  Interface,
  PlatformContext,
} from "@macrograph/interface";
import * as pkgs from "@macrograph/packages";
import { deserializeProject, serde } from "@macrograph/runtime-serde";
import { makePersisted } from "@solid-primitives/storage";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import { Show, createSignal, onMount } from "solid-js";
import "tauri-plugin-midi";
import * as v from "valibot";

import { Button } from "@macrograph/ui";
import "./app.css";
import { core, wsProvider } from "./core";
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
  pkgs.obs.pkg,
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
  pkgs.websocket.pkg,
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
      const serializedProject = v.parse(
        serde.Project,
        JSON.parse(savedProject),
      );
      core
        .load((c) => deserializeProject(c, serializedProject))
        .finally(() => {
          setLoaded(true);
        });
    } else if (savedProjectRoot) {
      const serializedProjectRoot = v.parse(
        serde.ProjectRoot,
        JSON.parse(savedProjectRoot),
      );

      const graphs: serde.Graph[] = [];

      for (const graphId of serializedProjectRoot.graphs) {
        const data = localStorage.getItem(`project-graph-${graphId}`);
        if (!data) throw new Error(`Graph ${graphId} not found`);
        const graph = v.parse(serde.Graph, JSON.parse(data));
        graphs.push(graph);
      }

      const variables: serde.Variable[] = [];

      for (const variableId of serializedProjectRoot.variables) {
        const data = localStorage.getItem(`project-variable-${variableId}`);
        if (!data) throw new Error(`Variable ${variableId} not found`);
        const variable = v.parse(serde.Variable, JSON.parse(data));
        variables.push(variable);
      }

      core
        .load((c) =>
          deserializeProject(c, {
            ...serializedProjectRoot,
            graphs,
            variables,
          }),
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
        <Interface core={core} environment="custom" />
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
