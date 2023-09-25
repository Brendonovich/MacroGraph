import { Match, Switch, createSignal, Suspense, Show } from "solid-js";
import { Button } from "@macrograph/ui";

import { Ctx } from "./ctx";
import { None, Some } from "@macrograph/core";

export default function ({ core, setAuthToken, authToken, user }: Ctx) {
  const [loggingIn, setLoggingIn] = createSignal(false);

  return (
    <Switch>
      <Match when={authToken().isSome() && authToken().unwrap()}>
        <Suspense fallback="Authenticating...">
          <Show when={user()}>
            {(user) => (
              <div class="flex flex-row items-center gap-2">
                <p>Logged in as {user().display_name}</p>
                <Button onClick={() => setAuthToken(None)}>Log Out</Button>
              </div>
            )}
          </Show>
        </Suspense>
      </Match>
      <Match when={loggingIn()}>
        <div class="flex space-x-4 items-center">
          <p>Logging in...</p>
          <Button onClick={() => setLoggingIn(false)}>Cancel</Button>
        </div>
      </Match>
      <Match when={!loggingIn()}>
        <Button
          onClick={async () => {
            setLoggingIn(true);

            try {
              const token = await core.oauth.authorize("spotify");

              if (!loggingIn()) return;

              setAuthToken(Some(token));
            } finally {
              setLoggingIn(false);
            }
          }}
        >
          Login
        </Button>
      </Match>
    </Switch>
  );
}
