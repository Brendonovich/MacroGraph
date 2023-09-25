import { Match, Switch, createSignal, Suspense, Show } from "solid-js";
import { Button } from "@macrograph/ui";

import { Ctx } from "./ctx";
import { Some } from "@macrograph/core";

export default function ({ core, setAuthToken, authToken, user }: Ctx) {
  const [loggingIn, setLoggingIn] = createSignal(false);

  return (
    <Switch>
      <Match when={authToken().isSome() && authToken().unwrap()}>
        <Suspense fallback="Authenticating...">
          <Show when={user()}>
            {(user) => <>Logged in as {user().data.attributes.full_name}</>}
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
              const token = await core.oauth.authorize("patreon");

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
