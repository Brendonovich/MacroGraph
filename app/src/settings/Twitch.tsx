import { createSignal, For, Match, Switch } from "solid-js";
import { twitch } from "@macrograph/packages";
import { Some } from "@macrograph/core";
import { Button } from "./ui";
import { rspc } from "~/rspc";

export default () => {
  const [loggingIn, setLoggingIn] = createSignal(false);

  const { helix, chat, auth } = twitch;

  return (
    <>
      <table class="table-auto">
        <thead>
          <tr>
            <th>Account</th>
            <th>Helix Api</th>
            <th>Chat Account</th>
            <th>Chat Channel</th>
          </tr>
        </thead>
        <tbody>
          <For each={Object.values(twitch.auth.tokens)}>
            {(token) => (
              <tr>
                <td>{token.userName}</td>
                <td>
                  <input
                    type="radio"
                    id="helix"
                    checked={twitch.helix
                      .userId()
                      .map((id) => id === token.userId)
                      .unwrapOr(false)}
                    onChange={(r) => {
                      if (r.target.checked) helix.setUserId(Some(token.userId));
                    }}
                  />
                </td>
                <td>
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
                <td>
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
              </tr>
            )}
          </For>
        </tbody>
      </table>
      <Switch
        fallback={
          <>
            {/* Loading...
            <Button onClick={() => twitch.auth.authProvider.logOut()}>
              Cancel
            </Button> */}
          </>
        }
      >
        <Match when={loggingIn()}>
          {(_) => {
            rspc.createSubscription(() => ["auth.twitch"], {
              onData: (m) => {
                if (typeof m === "object" && "Received" in m) {
                  auth.addUser({
                    ...m.Received,
                    obtainmentTimestamp: Date.now(),
                    userId: "",
                    userName: "",
                  });
                  setLoggingIn(false);
                }
              },
              onError: () => {
                setLoggingIn(false);
              },
            });

            return (
              <div class="flex space-x-4 items-center">
                <p>Logging in...</p>
                <Button onClick={() => setLoggingIn(false)}>Cancel</Button>
              </div>
            );
          }}
        </Match>
      </Switch>
      <Button onClick={() => setLoggingIn(true)}>Login</Button>
    </>
  );
};
