import { Match, Switch, createSignal } from "solid-js";
import { Button } from "@macrograph/ui";

import { Ctx } from "./ctx";

export default function ({ core }: Ctx) {
  const [loggingIn, setLoggingIn] = createSignal(false);

  return (
    <Switch>
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
              await core.oauth.authorize("google");

              if (!loggingIn()) return;
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
