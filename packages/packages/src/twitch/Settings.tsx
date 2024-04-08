import { For, Match, Show, Suspense, Switch } from "solid-js";
import { createAsync } from "@solidjs/router";
import { AsyncButton, Button } from "@macrograph/ui";
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
    <Suspense>
      <ul class="flex flex-col mb-2 space-y-2">
        <Show when={credentials()}>
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
                          <AsyncButton
                            onClick={() => auth.enableAccount(cred.id)}
                            loadingChildren="Enabling..."
                          >
                            Enable
                          </AsyncButton>
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
                                  <AsyncButton
                                    loadingChildren="Connecting..."
                                    onClick={() => {
                                      setPersisted(account().data.id, {
                                        eventsub: true,
                                      });
                                      return eventSub.connectSocket(account());
                                    }}
                                  >
                                    Connect
                                  </AsyncButton>
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
                                  <AsyncButton
                                    onClick={() => {
                                      setPersisted(account().data.id, {
                                        chat: false,
                                      });
                                      return chat.disconnectClient(account());
                                    }}
                                    loadingChildren="Disconnecting..."
                                  >
                                    Disconnect
                                  </AsyncButton>
                                </Match>
                                <Match
                                  when={
                                    !chatClient() ||
                                    chatClient()?.status === "disconnected"
                                  }
                                >
                                  <span>Chat Disconnected</span>
                                  <AsyncButton
                                    onClick={() => {
                                      setPersisted(account().data.id, {
                                        chat: true,
                                      });
                                      return chat.connectClient(account());
                                    }}
                                    loadingChildren="Connecting..."
                                  >
                                    Connect
                                  </AsyncButton>
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
    </Suspense>
  );
};
