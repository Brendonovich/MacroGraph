import { createSignal, For, Match, Switch } from "solid-js";
import { twitch } from "@macrograph/packages";
import { Button } from "./ui";
import { Maybe, None, Some } from "@macrograph/core";
import { rspc } from "~/rspc";
import { authProvider } from "~/../../packages/src/twitch/auth";
import {
  account,
  setAccount,
  chatChannel,
  setChannel,
  client,
} from "@macrograph/packages/src/twitch/chat";
import { api, setApi } from "~/../../packages/src/twitch/helix";

export default () => {
  const [loggingIn, setLoggingIn] = createSignal(false);

  const tokens = () => authProvider.tokens;

  return (
    <>
      <table class="table-auto">
        <thead>
          <tr>
            <th>Account</th>
            <th>Api</th>
            <th>Chat Account</th>
            <th>Chat Channel</th>
          </tr>
        </thead>
        <tbody>
          <For each={Object.keys(tokens())}>
            {(userId) => (
              <tr>
                <td>{tokens()[userId]?.userName}</td>
                <td>
                  <input
                    type="checkbox"
                    id="api"
                    checked={api() === userId}
                    onclick={(r) => {
                      if (r.target.checked) {
                        client().map((f) => f.disconnect());
                        setApi(userId);
                        localStorage.setItem("api", userId);
                      }
                    }}
                  ></input>
                </td>
                <td>
                  <input
                    type="checkbox"
                    id="Chat Read"
                    checked={account() === userId}
                    onclick={(r) => {
                      if (r.target.checked) {
                        client().map((f) => f.disconnect());
                        setAccount(userId);
                        localStorage.setItem("read", userId);
                      }
                    }}
                  ></input>
                </td>
                <td>
                  <input
                    type="checkbox"
                    id="Chat Write"
                    checked={chatChannel() === userId}
                    onclick={(r) => {
                      if (r.target.checked) {
                        client().map((f) => f.disconnect());
                        setChannel(userId);
                        localStorage.setItem("write", userId);
                      }
                    }}
                  ></input>
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
                  twitch.auth.authProvider.addUser({
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
