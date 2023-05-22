import { createSignal, Match, Switch } from "solid-js";
import { twitch } from "@macrograph/packages";
import { Button } from "./ui";
import { None, Some } from "@macrograph/core";
import { rspc } from "~/rspc";

export default () => {
  const [loggingIn, setLoggingIn] = createSignal(false);

  return (
    <Switch
      fallback={
        <>
          Loading...
          <Button onClick={() => twitch.auth.setAccessToken(None)}>
            Logout
          </Button>
        </>
      }
    >
      <Match when={twitch.helix.user().toNullable()}>
        {(user) => (
          <div class="flex space-x-4 items-center">
            <p>Logged in as {user().name}</p>
            <Button onClick={() => twitch.auth.setAccessToken(None)}>
              Logout
            </Button>
          </div>
        )}
      </Match>
      <Match when={loggingIn()}>
        {(_) => {
          rspc.createSubscription(() => ["auth.twitch"], {
            onData: (m) => {
              if (typeof m === "object" && "Received" in m) {
                twitch.auth.setAccessToken(Some(m.Received));
                setLoggingIn(false);
              }
            },
            onError: () => {
              twitch.auth.setAccessToken(None);
              setLoggingIn(false);
            },
          });

          return (
            <div class="flex space-x-4 items-center">
              <p>Logging in...</p>
              <Button onClick={() => setLoggingIn(false)}>Cancel</Button>
            </div>
          );
        }}
      </Match>
      <Match when={twitch.auth.accessToken().isNone()}>
        <Button onClick={() => setLoggingIn(true)}>Login</Button>
      </Match>
    </Switch>
  );
};
