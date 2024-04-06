import { createSignal, For, Match, Show, Switch } from "solid-js";
import { makeTimer } from "@solid-primitives/timer";
import { createAsync } from "@solidjs/router";
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
  const credentials = createAsync(() => core.getCredentials());

  return (
    <>
      <ul class="flex flex-col mb-2 space-y-2">
        <Show
          when={(() => {
            const c = credentials();
            return c?.status === 200 && c.body;
          })()}
        >
          {(creds) => (
            <For each={creds().filter((cred) => cred.provider === "twitch")}>
              {(cred) => {
                const account = () => auth.accounts.get(cred.id);

                return (
                  <li>
                    <div class="flex flex-row items-center justify-between">
                      <Tooltip.Root>
                        <Tooltip.Trigger>
                          <span>{cred.displayName}</span>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content class="bg-neutral-900 text-white border border-neutral-400 px-2 py-1 rounded">
                            <Tooltip.Arrow />
                            {/* <p>
                            Expires in {Math.floor(expiryTime - now() / 1000)}s
                          </p> */}
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                      <Show
                        when={account()}
                        children={
                          <Button onClick={() => auth.disableAccount(cred.id)}>
                            Disable
                          </Button>
                        }
                        fallback={
                          <Button
                            onClick={() => (
                              console.log(cred), auth.enableAccount(cred.id)
                            )}
                          >
                            Enable
                          </Button>
                        }
                      />
                    </div>
                    <Show when={account()?.()}>
                      {(account) => {
                        const eventSubSocket = () =>
                          eventSub.sockets.get(account().data.id);
                        const chatClient = () =>
                          chat.clients.get(account().data.id);

                        return (
                          <div class="space-y-2">
                            <div class="space-x-2">
                              <Switch fallback="EventSub Connecting...">
                                <Match when={!eventSubSocket()}>
                                  <span>EventSub Disconnected</span>
                                  <Button
                                    onClick={() => {
                                      eventSub.connectSocket(account());
                                      setPersisted(account().data.id, {
                                        eventsub: true,
                                      });
                                    }}
                                  >
                                    Connect
                                  </Button>
                                </Match>
                                <Match when={eventSubSocket()}>
                                  <span>EventSub Connected</span>
                                  <Button
                                    onClick={() => {
                                      eventSub.disconnectSocket(
                                        account().data.id
                                      );
                                      setPersisted(account().data.id, {
                                        eventsub: false,
                                      });
                                    }}
                                  >
                                    Disconnect
                                  </Button>
                                </Match>
                              </Switch>
                            </div>
                            <div class="space-x-2">
                              <Switch fallback="Chat Connecting...">
                                <Match
                                  when={chatClient()?.status === "connected"}
                                >
                                  <span>Chat Connected</span>
                                  <Button
                                    onClick={() => {
                                      chat.disconnectClient(account());
                                      setPersisted(account().data.id, {
                                        chat: false,
                                      });
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
                                      chat.connectClient(account());
                                      setPersisted(account().data.id, {
                                        chat: true,
                                      });
                                    }}
                                  >
                                    Connect
                                  </Button>
                                </Match>
                              </Switch>
                            </div>
                          </div>
                        );
                      }}
                    </Show>
                  </li>
                );
              }}
            </For>
          )}
        </Show>
      </ul>
      <span class="text-sm text-gray-300">
        Access more accounts by{" "}
        <a class="underline" href="/credentials" target="external">
          adding credentials
        </a>
      </span>
    </>
  );
};
