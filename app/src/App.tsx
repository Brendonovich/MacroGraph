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
}

export default App;
