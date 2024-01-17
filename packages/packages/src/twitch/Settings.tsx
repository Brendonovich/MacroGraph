import { createSignal, For, Match, onCleanup, onMount, Switch } from "solid-js";
import { Button } from "@macrograph/ui";
import { Tooltip } from "@kobalte/core";

import { Ctx } from "./ctx";

export default ({ core, auth, eventSub }: Ctx) => {
  const [loggingIn, setLoggingIn] = createSignal(false);

  return (
    <>
      <ul class="flex flex-col mb-2 space-y-2">
        <For each={[...auth.accounts.values()]}>
          {(account) => {
            const expiryTime =
              account.token.expires_in + account.token.issued_at;

            const [now, setNow] = createSignal(Date.now());

            onMount(() => {
              const interval = setInterval(() => {
                setNow(Date.now());
              }, 1000);

              onCleanup(() => clearInterval(interval));
            });

            const expiresIn = () => {
              return Math.floor(expiryTime - now() / 1000);
            };

            return (
              <li>
                <div class="flex flex-row items-center justify-between">
                  <Tooltip.Root>
                    <Tooltip.Trigger>
                      <span>{account.data.display_name}</span>
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Content class="bg-neutral-900 text-white border border-neutral-400 px-2 py-1 rounded">
                        <Tooltip.Arrow />
                        <p>Expires in {expiresIn()}s</p>
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                  <Button onClick={() => auth.logOut(account.data.id)}>
                    Remove
                  </Button>
                </div>
                <div class="space-x-2">
                  <Switch fallback="EventSub Connecting...">
                    <Match when={!account.eventsub}>
                      <span>EventSub Disconnected</span>
                      <Button
                        onClick={() => eventSub.connectSocket(account.data.id)}
                      >
                        Connect
                      </Button>
                    </Match>
                    <Match when={eventSub.sockets.get(account.data.id)}>
                      EventSub Connected
                      <Button
                        onClick={() =>
                          eventSub.disconnectSocket(account.data.id)
                        }
                      >
                        Disconnect
                      </Button>
                    </Match>
                  </Switch>
                </div>
              </li>
            );
          }}
        </For>
      </ul>
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
                const token = await core.oauth.authorize("twitch");

                if (!loggingIn()) return;

                await auth.addToken(token);
              } finally {
                setLoggingIn(false);
              }
            }}
          >
            Add Account
          </Button>
        </Match>
      </Switch>
    </>
  );
};
