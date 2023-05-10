import { createEffect, createSignal, Match, onCleanup, Switch } from "solid-js";
import { rspc } from "./rspc";

const TWITCH_ACCESS_TOKEN = "TwitchAccessToken";

type State =
  | { state: "notLoggedIn"; error?: string }
  | { state: "loggingIn" }
  | { state: "loggedIn"; token: string };

export default () => {
  const token = localStorage.getItem(TWITCH_ACCESS_TOKEN);

  const [state, setState] = createSignal<State>(
    token === null ? { state: "notLoggedIn" } : { state: "loggedIn", token }
  );

  return (
    <Switch>
      <Match when={state().state === "notLoggedIn"}>
        <button
          class="ring-4 ring-black bg-purple-700 my-2 text-white"
          onClick={() => setState({ state: "loggingIn" })}
        >
          Login with Twitch
        </button>
      </Match>
      <Match when={state().state === "loggingIn"}>
        {(_) => {
          rspc.createSubscription(() => ["auth.twitch"], {
            onData: (m) => {
              if (typeof m === "object" && "Received" in m) {
                setState({ state: "loggedIn", token: m.Received });
              }
            },
            onError: (e) =>
              setState({ state: "notLoggedIn", error: e.message }),
          });

          return (
            <>
              <p>Logging in...</p>
              <button onClick={() => setState({ state: "notLoggedIn" })}>
                Cancel
              </button>
            </>
          );
        }}
      </Match>
      <Match when={state().state === "loggedIn"}>
        <p>Logged Into Twitch</p>
        <button
          type="button"
          onclick={() => {
            localStorage.removeItem(TWITCH_ACCESS_TOKEN);
            setState({ state: "notLoggedIn" });
          }}
        >
          Logout
        </button>
      </Match>
    </Switch>
  );
};
