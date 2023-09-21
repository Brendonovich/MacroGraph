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
  fs,
  discord,
  http,
  streamdeck,
} from "@macrograph/packages";
import { onMount } from "solid-js";
import { client } from "./rspc";

function App() {
  const core = new Core({
    fetch,
    doOAuth: (provider) =>
      client.mutation([
        "oauth.run",
        `${import.meta.env.VITE_MACROGRAPH_API_URL}/auth/${provider}/login`,
      ]),
  });

  onMount(() => {
    [
      discord.pkg,
      () => fs.pkg({ list: (path) => client.query(["fs.list", path]) }),
      goxlr.pkg,
      http.pkg,
      json.pkg,
      keyboard.pkg,
      list.pkg,
      localStorage.pkg,
      logic.pkg,
      map.pkg,
      obs.pkg,
      streamdeck.pkg,
      streamlabs.pkg,
      twitch.pkg,
      utils.pkg,
    ].map((p) => core.registerPackage(p));
  });

  return <Interface core={core} />;
}

export default App;
