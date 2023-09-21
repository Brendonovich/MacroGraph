import { Core } from "@macrograph/core";
import Interface from "@macrograph/interface";
import * as pkgs from "@macrograph/packages";
import { onMount } from "solid-js";

import { fetch } from "./http";
import { client } from "./rspc";

const AUTH_URL = `${import.meta.env.VITE_MACROGRAPH_API_URL}/auth`;

function App() {
  const core = new Core({
    fetch,
    oauth: {
      authorize: (provider) =>
        client.mutation(["oauth.authorize", `${AUTH_URL}/${provider}/login`]),
      refresh: async (provider, refreshToken) => {
        const res = await fetch(`${AUTH_URL}/${provider}/refresh`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        console.log(res);

        return await res.json();
      },
    },
  });

  onMount(() => {
    [
      pkgs.discord.pkg,
      () =>
        pkgs.fs.register({
          list: (path) => client.query(["fs.list", path]),
        }),
      pkgs.goxlr.pkg,
      pkgs.http.pkg,
      pkgs.json.pkg,
      pkgs.keyboard.pkg,
      pkgs.list.pkg,
      pkgs.localStorage.pkg,
      pkgs.logic.pkg,
      pkgs.map.pkg,
      pkgs.obs.pkg,
      pkgs.streamdeck.pkg,
      pkgs.streamlabs.pkg,
      pkgs.twitch.pkg,
      pkgs.utils.pkg,
    ].map((p) => core.registerPackage(p));
  });

  return <Interface core={core} />;
}

export default App;
