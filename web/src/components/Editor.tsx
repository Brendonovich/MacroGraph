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

export default () => {
  const core = new Core({
    fetch,
    doOAuth: async (urlString, params) => {
      const loginWindow = window.open(
        `${urlString}?${new URLSearchParams({
          ...params,
          state: JSON.stringify({
            env: "web",
          }),
        })}`
      );

      if (!loginWindow) {
        return null;
      }

      return await new Promise<any>((res) =>
        window.addEventListener("message", (e) => {
          if (e.origin !== window.origin) return;

          res(e.data);
        })
      );
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
