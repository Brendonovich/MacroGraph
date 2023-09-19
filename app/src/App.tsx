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
    doOAuth: async (url, args) => {
      client.addSubscription(["oauth.run", { url, args }], {
        onData: async () => {
          // if (typeof m === "object" && "Received" in m) {
          //   const userId = await auth.addUser({
          //     ...m.Received,
          //     obtainmentTimestamp: Date.now(),
          //     userId: "",
          //     userName: "",
          //   });
          //   if (auth.tokens.size === 1) {
          //     twitch.chat.setReadUserId(Maybe(userId));
          //     twitch.chat.setWriteUserId(Maybe(userId));
          //     twitch.helix.setUserId(Maybe(userId));
          //   }
          //   setLoggingIn(false);
          // }
        },
        // onError: () => {
        //   setLoggingIn(false);
        // },
      });
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
}

export default App;
