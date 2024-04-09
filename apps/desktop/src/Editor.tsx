import {
  ConnectionsDialog,
  Interface,
  PlatformContext,
} from "@macrograph/interface";
import { makePersisted } from "@solid-primitives/storage";
import { createWsProvider } from "@macrograph/runtime";
import { convertFileSrc } from "@tauri-apps/api/tauri";
import * as pkgs from "@macrograph/packages";
import { createSignal } from "solid-js";
import "tauri-plugin-midi";

import { client } from "./rspc";
import "./app.css";
import { createPlatform } from "./platform";
import { core } from "./core";
import { Button } from "@macrograph/ui";

const [projectUrl, setProjectUrl] = makePersisted(
  createSignal<string | null>(null),
  { name: "currentProjectUrl" }
);

const platform = createPlatform({
  projectUrl,
  setProjectUrl,
  core,
});

const wsProvider = createWsProvider({
  async startServer(port, onData) {
    return client.addSubscription(["websocket.server", port], {
      onData: (d) => onData(d),
    });
  },
  async stopServer(unsubscribe) {
    unsubscribe();
  },
  async sendMessage(data) {
    return client.mutation([
      "websocket.send",
      { port: data.port, client: data.client, data: data.data },
    ]);
  },
});

[
  () =>
    pkgs.audio.pkg({
      prepareURL: (url: string) =>
        convertFileSrc(url).replace("asset://", "https://asset."),
    }),
  pkgs.discord.pkg,
  () =>
    pkgs.fs.register({
      list: (path) => client.query(["fs.list", path]),
    }),
  pkgs.github.pkg,
  pkgs.goxlr.pkg,
  pkgs.google.pkg,
  pkgs.http.pkg,
  pkgs.json.pkg,
  pkgs.keyboard.pkg,
  pkgs.list.pkg,
  pkgs.localStorage.pkg,
  pkgs.logic.pkg,
  pkgs.map.pkg,
  pkgs.obs.pkg,
  pkgs.patreon.pkg,
  pkgs.spotify.pkg,
  () => pkgs.streamdeck.pkg(wsProvider),
  pkgs.streamlabs.pkg,
  pkgs.twitch.pkg,
  pkgs.utils.pkg,
  pkgs.openai.pkg,
  pkgs.websocket.pkg,
  pkgs.variables.pkg,
  pkgs.customEvents.pkg,
  pkgs.speakerbot.pkg,
  () => pkgs.websocketServer.pkg(wsProvider),
  pkgs.globalKeyboardMouse.pkg,
  // pkgs.midi.pkg,
].map((p) => core.registerPackage(p));

export default function Editor() {
  return (
    <PlatformContext.Provider value={platform}>
      <Interface core={core} environment="custom" />
    </PlatformContext.Provider>
  );
}

export function MenuItems() {
  return (
    <>
      <ConnectionsDialog core={core} />
      <Button
        title="Save Project"
        size="icon"
        variant="ghost"
        onClick={(e) => platform.projectPersistence.saveProject(e.shiftKey)}
      >
        <IconFaSolidSave class="w-6 h-6" />
      </Button>
      <Button
        title="Load Project"
        size="icon"
        variant="ghost"
        onClick={() => platform.projectPersistence.loadProject()}
      >
        <IconTdesignFolderImport class="w-6 h-6" />
      </Button>
    </>
  );
}
