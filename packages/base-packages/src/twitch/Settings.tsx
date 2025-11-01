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

export default function Settings(
  props: SettingsProps<typeof RPCS, typeof STATE>,
) {
  return (
    <div class="w-full -mt-1">
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
                      EVENTSUB_CONNECTION_INDICATOR[acc().eventSubSocket.state]
                        .class,
                    )}
                  />
                  <span class="text-xs text-gray-11 italic">
                    {
                      EVENTSUB_CONNECTION_INDICATOR[acc().eventSubSocket.state]
                        .label
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
    </div>
  );
}

export const Rpcs = RPCS;
