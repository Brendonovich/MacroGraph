import { createSignal, For, Match, Switch } from "solid-js";
import { makeTimer } from "@solid-primitives/timer";
import { Button } from "@macrograph/ui";
import { Tooltip } from "@kobalte/core";

import { Ctx } from "./ctx";

export default ({
  core,
  auth,
  eventSub,
  chat,
  persisted: [, setPersisted],
}: Ctx) => {
  const [loggingIn, setLoggingIn] = createSignal(false);

  return (
    <>
      <ul class="flex flex-col mb-2 space-y-2">
        <For each={[...auth.accounts.values()]}>
          {(account) => {
            const expiryTime =
              account.token.expires_in + account.token.issued_at;

            const [now, setNow] = createSignal(Date.now());

            makeTimer(() => setNow(Date.now()), 1000, setInterval);

            const eventSubSocket = () => eventSub.sockets.get(account.data.id);
            const chatClient = () => chat.clients.get(account.data.id);

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
                        <p>
                          Expires in {Math.floor(expiryTime - now() / 1000)}s
                        </p>
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip.Root>
                  <Button onClick={() => auth.logOut(account.data.id)}>
                    Remove
                  </Button>
                </div>
                <div class="space-y-2">
                  <div class="space-x-2">
                    <Switch fallback="EventSub Connecting...">
                      <Match when={!eventSubSocket()}>
                        <span>EventSub Disconnected</span>
                        <Button
                          onClick={() => {
                            eventSub.connectSocket(account);
                            setPersisted(account.data.id, "eventsub", true);
                          }}
                        >
                          Connect
                        </Button>
                      </Match>
                      <Match when={eventSubSocket()}>
                        <span>EventSub Connected</span>
                        <Button
                          onClick={() => {
                            eventSub.disconnectSocket(account.data.id);
                            setPersisted(account.data.id, "eventsub", false);
                          }}
                        >
                          Disconnect
                        </Button>
                      </Match>
                    </Switch>
                  </div>
                  <div class="space-x-2">
                    <Switch fallback="Chat Connecting...">
                      <Match when={chatClient()?.status === "connected"}>
                        <span>Chat Connected</span>
                        <Button
                          onClick={() => {
                            chat.disconnectClient(account);
                            setPersisted(account.data.id, "chat", false);
                          }}
                        >
                          Disconnect
                        </Button>
                      </Match>
                      <Match
                        when={
                          !chatClient() ||
                          chatClient()?.status === "disconnected"
                        }
                      >
                        <span>Chat Disconnected</span>
                        <Button
                          onClick={() => {
                            chat.connectClient(account);
                            setPersisted(account.data.id, "chat", true);
                          }}
                        >
                          Connect
                        </Button>
                      </Match>
                    </Switch>
                  </div>
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
