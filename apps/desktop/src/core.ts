import {
  Core,
  RefreshedOAuthToken,
  createWsProvider,
} from "@macrograph/runtime";
import * as pkgs from "@macrograph/packages";
import { convertFileSrc } from "@tauri-apps/api/tauri";

import { fetch } from "./http";
import { client } from "./rspc";
import { env } from "./env";

const AUTH_URL = `${env.VITE_MACROGRAPH_API_URL}/auth`;

export const core = new Core({
  fetch: fetch as any,
  oauth: {
    authorize: (provider) =>
      new Promise((res) => {
        client.addSubscription(
          ["oauth.authorize", `${AUTH_URL}/${provider}/login`],
          {
            onData(data) {
              res({ ...data, issued_at: Date.now() / 1000 });
            },
          }
        );
      }),
    refresh: async (provider, refreshToken) => {
      const res = await fetch(`${AUTH_URL}/${provider}/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      return {
        ...((await res.json()) as RefreshedOAuthToken),
        issued_at: Date.now() / 1000,
      };
    },
  },
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
  pkgs.obsPhysicsbyJdude.pkg,
  () => pkgs.websocketServer.pkg(wsProvider),
].map((p) => core.registerPackage(p));
