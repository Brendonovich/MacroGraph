import { createSignal, For, Match, onCleanup, onMount, Switch } from "solid-js";
import { Some } from "@macrograph/core";
import { Button } from "@macrograph/ui";
import { Tooltip } from "@kobalte/core";

import { Ctx } from "./ctx";

export default ({ core, helix, chat, auth }: Ctx) => {
  const [loggingIn, setLoggingIn] = createSignal(false);

  const columns = [
    { name: "Helix API", user: helix.user },
    { name: "Chat Read", user: chat.readUser },
    { name: "Chat Write", user: chat.writeUser },
  ];

  return (
    <>
      <Switch>
        <Match when={auth.accounts.size !== 0}>
          <table class="mb-2 table-auto w-full">
            <thead>
              <tr>
                <th class="pr-2 text-left">Account</th>
                <For each={columns}>
                  {(column) => <th class="px-2 text-center">{column.name}</th>}
                </For>
              </tr>
            </thead>
            <tbody>
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
                      <For each={columns}>
                        {(column) => (
                          <td class="text-center content-center align-middle">
                            <input
                              type="radio"
                              id={column.name}
                              checked={column.user
                                .account()
                                .map((a) => a.data.id === account.data.id)
                                .unwrapOr(false)}
                              onChange={async (r) => {
                                if (r.target.checked)
                                  column.user.setId(Some(account.data.id));
                              }}
                            />
                          </td>
                        )}
                      </For>
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
