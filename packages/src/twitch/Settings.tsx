import { createSignal, For, Match, Switch } from "solid-js";
import { Some } from "@macrograph/core";
import { Button } from "@macrograph/ui";

import { Ctx } from "./ctx";

export default ({ core, helix, chat, auth }: Ctx) => {
  const [loggingIn, setLoggingIn] = createSignal(false);

  return (
    <>
      <Switch>
        <Match when={auth.tokens.size !== 0}>
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
              <For each={[...auth.tokens.values()]}>
                {(token) => (
                  <tr>
                    <td>{token.userName}</td>
                    <td class="text-center content-center align-middle">
                      <input
                        type="radio"
                        id="helix"
                        checked={helix
                          .userId()
                          .map((id) => id === token.userId)
                          .unwrapOr(false)}
                        onChange={async (r) => {
                          if (r.target.checked)
                            helix.setUserId(Some(token.userId));
                        }}
                      />
                    </td>
                    <td class="text-center content-center align-middle">
                      <input
                        type="radio"
                        id="Chat Read"
                        checked={chat
                          .readUserId()
                          .map((u) => u === token.userId)
                          .unwrapOr(false)}
                        onChange={(r) => {
                          if (r.target.checked)
                            chat.setReadUserId(Some(token.userId));
                        }}
                      />
                    </td>
                    <td class="text-center content-center align-middle">
                      <input
                        type="radio"
                        id="Chat Write"
                        checked={chat
                          .writeUserId()
                          .map((u) => u === token.userId)
                          .unwrapOr(false)}
                        onChange={(r) => {
                          if (r.target.checked)
                            chat.setWriteUserId(Some(token.userId));
                        }}
                      />
                    </td>
                    <td>
                      <Button onClick={() => auth.logOut(token.userId)}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                )}
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
                const token = await core.doOAuth("twitch");

                if (!loggingIn()) return;

                await auth.addUser({
                  accessToken: token.access_token,
                  refreshToken: token.refresh_token,
                  expiresIn: token.expires_in,
                  scope: token.scope,
                  obtainmentTimestamp: Date.now(),
                  userId: "",
                  userName: "",
                });
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
