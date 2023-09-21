import { Core } from "@macrograph/core";
import Interface from "@macrograph/interface";
import {
  obs,
  keyboard,
  json,
  list,
  utils,
  twitch,
  logic,
  streamlabs,
  goxlr,
  map,
  localStorage,
} from "@macrograph/packages";
import { onMount } from "solid-js";
import { env } from "~/env/client";

const AUTH_URL = `${env.PUBLIC_VERCEL_URL}/auth`;

export default () => {
  const core = new Core({
    fetch,
    oauth: {
      authorize: async (provider) => {
        const loginWindow = window.open(
          `${AUTH_URL}/${provider}/login?${new URLSearchParams({
            state: window.btoa(
              JSON.stringify({
                env: "web",
                targetOrigin: window.origin,
              })
            ),
          })}`
        );

        if (!loginWindow) {
          return null;
        }

        return await new Promise<any>((res) =>
          window.addEventListener("message", (e) => {
            if (e.source !== loginWindow) return;

            res(e.data);
          })
        );
      },
      refresh: async (provider, refreshToken) => {
        const res = await fetch(`${AUTH_URL}/${provider}/refresh`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        return await res.json();
      },
    },
  });

  onMount(() => {
    [
      obs.pkg,
      keyboard.pkg,
      json.pkg,
      list.pkg,
      utils.pkg,
      twitch.pkg,
      logic.pkg,
      streamlabs.pkg,
      goxlr.pkg,
      map.pkg,
      localStorage.pkg,
    ].map((p) => core.registerPackage(p));
  });

  return <Interface core={core} />;
};
