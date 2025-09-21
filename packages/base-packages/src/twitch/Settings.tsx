import { EffectButton, type SettingsProps } from "@macrograph/package-sdk/ui";
import { cx } from "cva";
import {
  For,
  Index,
  type JSXElement,
  Match,
  type ParentProps,
  Switch,
} from "solid-js";

import { RPCS, type STATE } from "./shared";

const EVENTSUB_CONNECTION_INDICATOR = {
  connected: {
    class: "bg-green-600",
    label: "EventSub Connected",
  },
  disconnected: {
    class: "bg-red-600",
    label: "EventSub Disconnected",
  },
  connecting: {
    class: "bg-yellow-600",
    label: "EventSub Connecting",
  },
};

function RequireAuth(
  props: SettingsProps<typeof RPCS, typeof STATE> &
    ParentProps<{ fallbackChildren?: JSXElement }>,
) {
  return (
    <Switch>
      <Match
        when={
          props.globalState.auth.state === "logged-in" && props.globalState.auth
        }
      >
        {props.children}
      </Match>
      <Match
        when={
          props.globalState.auth.state === "logged-out" &&
          props.globalState.auth
        }
        keyed
      >
        {(auth) => (
          <>
            <EffectButton onClick={() => auth.login}>
              Sign In to MacroGraph
            </EffectButton>
            {props.fallbackChildren}
          </>
        )}
      </Match>
    </Switch>
  );
}

export default function Settings(
  props: SettingsProps<typeof RPCS, typeof STATE>,
) {
  return (
    <div class="w-full -mt-1">
      <RequireAuth
        {...props}
        fallbackChildren={
          <p class="text-center text-gray-11 -mt-2">
            Sign in to MacroGraph to access your linked Twitch accounts
          </p>
        }
      >
        <span class="text-gray-11 font-medium text-xs">Twitch Accounts</span>
        <ul class="rounded divide-y divide-gray-6 w-full mt-2">
          <Index
            each={props.state.accounts}
            fallback={
              <div class="text-center p-2 text-gray-11 w-full italic">
                No Twitch accounts found
              </div>
            }
          >
            {(acc) => (
              <li class="flex flex-row w-full items-center py-2 first:pt-0 last:pb-0">
                <div class="flex-1 flex flex-col gap-0.5">
                  <span class="font-medium">{acc().displayName}</span>
                  <div class="flex flex-row items-center gap-2">
                    <div
                      class={cx(
                        "size-2 rounded-full",
                        EVENTSUB_CONNECTION_INDICATOR[
                          acc().eventSubSocket.state
                        ].class,
                      )}
                    />
                    <span class="text-xs text-gray-11 italic">
                      {
                        EVENTSUB_CONNECTION_INDICATOR[
                          acc().eventSubSocket.state
                        ].label
                      }
                    </span>
                  </div>
                </div>

                <EffectButton
                  variant="text"
                  class="relative"
                  onClick={() =>
                    acc().eventSubSocket.state === "connected"
                      ? props.rpc.DisconnectEventSub({ accountId: acc().id })
                      : props.rpc.ConnectEventSub({ accountId: acc().id })
                  }
                >
                  <span>
                    {acc().eventSubSocket.state === "connected"
                      ? "Disconnect"
                      : "Connect"}
                  </span>
                </EffectButton>
              </li>
            )}
          </Index>
        </ul>
      </RequireAuth>
    </div>
  );
}

export const Rpcs = RPCS;
