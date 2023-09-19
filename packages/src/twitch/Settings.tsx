import { createSignal, For, Match, onMount, Switch } from "solid-js";
import { Some } from "@macrograph/core";
import { Button } from "@macrograph/ui";

import { Ctx } from "./ctx";

export default ({ helix, chat, auth }: Ctx) => {
  const [loggingIn, setLoggingIn] = createSignal(false);
  // const [currentTime, setCurrentTime] = createSignal(Date.now());

  // setInterval(() => {
  //   setCurrentTime(Date.now());
  // }, 1000);

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
                    {/* <td> */}
                    {/*   {Math.floor( */}
                    {/*     (token.obtainmentTimestamp + */}
                    {/*       (token.expiresIn ?? 0) * 1000 - */}
                    {/*       currentTime()) / */}
                    {/*       1000 */}
                    {/*   )} */}
                    {/*   s till expiry */}
                    {/* </td> */}
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
            // rspc.createSubscription(() => ["auth.twitch"], {
            //   onData: async (m) => {
            //     if (typeof m === "object" && "Received" in m) {
            //       const userId = await auth.addUser({
            //         ...m.Received,
            //         obtainmentTimestamp: Date.now(),
            //         userId: "",
            //         userName: "",
            //       });

            //       if (auth.tokens.size === 1) {
            //         twitch.chat.setReadUserId(Maybe(userId));
            //         twitch.chat.setWriteUserId(Maybe(userId));
            //         twitch.helix.setUserId(Maybe(userId));
            //       }

            //       setLoggingIn(false);
            //     }
            //   },
            //   onError: () => {
            //     setLoggingIn(false);
            //   },
            // });

            onMount(async () => {
              const url = new URL(
                `https://id.twitch.tv/oauth2/authorize?${new URLSearchParams({
                  client_id: "ldbp0fkq9yalf2lzsi146i0cip8y59",
                  redirect_uri: "http://localhost:4321/auth/twitch",
                  scope: SCOPES.join(" "),
                  response_type: "code",
                  force_verify: "false",
                })}`
              );

              const loginWindow = window.open(url);

              if (!loginWindow) {
                setLoggingIn(false);
                return;
              }

              try {
                const token = await new Promise<any>((res) =>
                  window.addEventListener("message", (e) => {
                    if (e.origin !== window.origin) return;

                    res(e.data);
                  })
                );

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
            });

            return (
              <div class="flex space-x-4 items-center">
                <p>Logging in...</p>
                <Button onClick={() => setLoggingIn(false)}>Cancel</Button>
              </div>
            );
          }}
        </Match>
        <Match when={!loggingIn()}>
          <Button onClick={() => setLoggingIn(true)}>Add Account</Button>
        </Match>
      </Switch>
    </>
  );
};

const SCOPES = [
  "analytics:read:extensions",
  "analytics:read:games",
  "bits:read",
  "channel:edit:commercial",
  "channel:manage:broadcast",
  "channel:read:charity",
  "channel:manage:extensions",
  "channel:manage:moderators",
  "channel:manage:polls",
  "channel:manage:predictions",
  "channel:manage:raids",
  "channel:manage:redemptions",
  "channel:manage:schedule",
  "channel:manage:videos",
  "channel:manage:vips",
  "channel:moderate",
  "channel:manage:redemptions",
  "channel:read:editors",
  "channel:read:goals",
  "channel:read:hype_train",
  "channel:read:polls",
  "channel:read:predictions",
  "channel:read:redemptions",
  "channel:read:stream_key",
  "channel:read:subscriptions",
  "channel:read:vips",
  "chat:edit",
  "chat:read",
  "clips:edit",
  "moderation:read",
  "moderator:manage:announcements",
  "moderator:manage:automod_settings",
  "moderator:manage:banned_users",
  "moderator:manage:chat_messages",
  "moderator:manage:chat_settings",
  "moderator:manage:shield_mode",
  "moderator:manage:shoutouts",
  "moderator:read:automod_settings",
  "moderator:read:blocked_terms",
  "moderator:read:chat_settings",
  "moderator:read:chatters",
  "moderator:read:followers",
  "moderator:read:shield_mode",
  "moderator:read:shoutouts",
  "user:edit",
  "user:manage:blocked_users",
  "user:manage:chat_color",
  "user:manage:whispers",
  "user:read:blocked_users",
  "user:read:broadcast",
  "user:read:email",
  "user:read:follows",
  "user:read:subscriptions",
  "whispers:read",
  "whispers:edit",
];
