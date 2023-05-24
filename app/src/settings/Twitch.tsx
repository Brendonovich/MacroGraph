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
          <Button onClick={() => twitch.auth.authProvider.logOut()}>
            Cancel
          </Button>
        </>
      }
    >
      <Match when={twitch.helix.user().toNullable()}>
        {(user) => (
          <div class="flex space-x-4 items-center">
            <p>Logged in as {user().name}</p>
            <Button onClick={() => twitch.auth.authProvider.logOut()}>
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
                twitch.auth.authProvider.addUser({
                  ...m.Received,
                  obtainmentTimestamp: Date.now(),
                  userId: "",
                });
                setLoggingIn(false);
              }
            },
            onError: () => {
              twitch.auth.authProvider.logOut();
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
      <Match when={twitch.auth.authProvider.token.isNone()}>
        <Button onClick={() => setLoggingIn(true)}>Login</Button>
      </Match>
    </Switch>
  );
};
