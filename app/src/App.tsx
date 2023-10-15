import { onMount } from "solid-js";
import { Core } from "@macrograph/core";
import Interface from "@macrograph/interface";
import * as pkgs from "@macrograph/packages";

import { fetch } from "./http";
import { client } from "./rspc";
import { env } from "./env";

const AUTH_URL = `${env.VITE_MACROGRAPH_API_URL}/auth`;

export default function () {
  const core = new Core({
    fetch,
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

        return { ...(await res.json()), issued_at: Date.now() / 1000 };
      },
    },
  });

  onMount(() => {
    [
      pkgs.audio.pkg,
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
      () =>
        pkgs.streamdeck.pkg({
          async startServer(port, onData) {
            return client.addSubscription(["websocket.server", port], {
              onData: (d) => onData(d),
            });
          },
          async stopServer(unsubscribe) {
            unsubscribe();
          },
        }),
      pkgs.streamlabs.pkg,
      pkgs.twitch.pkg,
      pkgs.utils.pkg,
    ].map((p) => core.registerPackage(p));
  });

  return <Interface core={core} />;
}
