import { createSignal, For, Match, onCleanup, onMount, Switch } from "solid-js";
import { Some } from "@macrograph/core";
import { Button } from "@macrograph/ui";
import { Tooltip } from "@kobalte/core";

import { Ctx } from "./ctx";

export default ({ core, helix, chat, auth }: Ctx) => {
  const [loggingIn, setLoggingIn] = createSignal(false);

  return (
    <>
      <Switch>
        <Match when={auth.accounts.size !== 0}>
          <table class="mb-2 table-auto">
            <thead>
              <tr>
                <th class="pr-2 text-left">Account</th>
                <th class="px-2 text-center content-center align-middle">
                  Helix Api
                </th>
                <th class="px-2 text-center content-center align-middle">
                  Chat Account
                </th>
                <th class="px-2 text-center content-center align-middle">
                  Chat Channel
                </th>
              </tr>
            </thead>
            <tbody>
              <For each={[...auth.accounts.values()]}>
                {(account) => {
                  const expiryTime =
                    account.token.expires_in * 1000 + account.token.issued_at;

                  const [now, setNow] = createSignal(Date.now());

                  onMount(() => {
                    const interval = setInterval(() => {
                      setNow(Date.now());
                    }, 1000);

                    onCleanup(() => clearInterval(interval));
                  });

                  const expiresIn = () => {
                    return Math.floor((expiryTime - now()) / 1000);
                  };

                  return (
                    <tr>
                      <td>
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
                      </td>
                      <td class="text-center content-center align-middle">
                        <input
                          type="radio"
                          id="helix"
                          checked={helix
                            .userId()
                            .map((id) => id === account.data.id)
                            .unwrapOr(false)}
                          onChange={async (r) => {
                            if (r.target.checked)
                              helix.setUserId(Some(account.data.id));
                          }}
                        />
                      </td>
                      <td class="text-center content-center align-middle">
                        <input
                          type="radio"
                          id="Chat Read"
                          checked={chat
                            .readUserId()
                            .map((u) => u === account.data.id)
                            .unwrapOr(false)}
                          onChange={(r) => {
                            if (r.target.checked)
                              chat.setReadUserId(Some(account.data.id));
                          }}
                        />
                      </td>
                      <td class="text-center content-center align-middle">
                        <input
                          type="radio"
                          id="Chat Write"
                          checked={chat
                            .writeUserId()
                            .map((u) => u === account.data.id)
                            .unwrapOr(false)}
                          onChange={(r) => {
                            if (r.target.checked)
                              chat.setWriteUserId(Some(account.data.id));
                          }}
                        />
                      </td>
                      <td>
                        <Button onClick={() => auth.logOut(account.data.id)}>
                          Remove
                        </Button>
                      </td>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </table>
        </Match>
      </Switch>
      <Switch>
        <Match when={loggingIn()}>
          {(_) => {
            return (
              <div class="flex space-x-4 items-center">
                <p>Logging in...</p>
                <Button onClick={() => setLoggingIn(false)}>Cancel</Button>
              </div>
            );
          }}
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
