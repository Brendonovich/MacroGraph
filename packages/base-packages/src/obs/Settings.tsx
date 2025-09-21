import { EffectButton, type SettingsProps } from "@macrograph/package-sdk/ui";
import { cx } from "cva";
import { type ComponentProps, For, splitProps } from "solid-js";
import { createStore } from "solid-js/store";

import { RPCS, type STATE } from "./shared";

const CONNECTION_INDICATOR = {
  connected: {
    class: "bg-green-600",
    label: "Connected",
  },
  disconnected: {
    class: "bg-red-600",
    label: "Disconnected",
  },
  connecting: {
    class: "bg-yellow-600",
    label: "Connecting",
  },
};

export default function Settings(
  props: SettingsProps<typeof RPCS, typeof STATE>,
) {
  return (
    <div class="flex flex-col gap-4">
      <AddSocketForm {...props} />
      <div>
        <span class="text-gray-11 font-medium text-xs">OBS Sockets</span>
        <ul class="rounded divide-y divide-gray-6 gap-4">
          <For
            each={props.state.connections}
            fallback={
              <div class="p-2 text-center text-gray-11 italic">No Sockets</div>
            }
          >
            {(conn) => <SocketListItem {...props} conn={conn} />}
          </For>
        </ul>
      </div>
    </div>
  );
}

function AddSocketForm(props: SettingsProps<typeof RPCS, typeof STATE>) {
  const [addSocket, setAddSocket] = createStore({
    address: "ws://localhost:4455",
    password: undefined as undefined | string,
  });

  return (
    <div class="flex flex-row gap-4 items-end">
      <InputField
        label="Socket URL"
        value="ws://localhost:4455"
        onChange={(e) => setAddSocket("address", e.target.value)}
      />
      <InputField
        label="Password"
        value=""
        placeholder="Optional"
        onChange={(e) => setAddSocket("password", e.target.value || undefined)}
      />
      <EffectButton onClick={() => props.rpc.AddSocket(addSocket)}>
        Add Socket
      </EffectButton>
    </div>
  );
}

function SocketListItem(
  props: SettingsProps<typeof RPCS, typeof STATE> & {
    conn: (typeof STATE)["Encoded"]["connections"][number];
  },
) {
  const conn = () => props.conn;

  return (
    <li class="flex flex-row py-2 w-full">
      <div class="flex flex-col gap-0.5">
        <span class="font-medium">TODO Name</span>
        <div class="flex flex-row items-center gap-2">
          <div
            class={cx(
              "size-2 rounded-full",
              CONNECTION_INDICATOR[conn().state].class,
            )}
          />
          <pre class="text-xs text-gray-11">{conn().address}</pre>
        </div>
      </div>
      <div class="flex-1 flex flex-row justify-end items-center gap-1">
        <EffectButton
          variant="text"
          onClick={() =>
            conn().state === "connected"
              ? props.rpc.DisconnectSocket({ address: conn().address })
              : props.rpc.ConnectSocket({ address: conn().address })
          }
        >
          {props.conn.state === "connected" ? "Disconnect" : "Connect"}
        </EffectButton>
        <EffectButton
          variant="textDanger"
          onClick={() => props.rpc.RemoveSocket({ address: conn().address })}
        >
          Remove
        </EffectButton>
      </div>
    </li>
  );
}

function InputField(props: { label: string } & ComponentProps<"input">) {
  const [labelProps, inputProps] = splitProps(props, ["label"]);
  return (
    <div class="flex flex-col gap-1 flex-1 items-stretch">
      <label class="font-medium text-xs text-gray-11">{labelProps.label}</label>
      <input
        class="bg-white/85 dark:bg-black/25 w-full h-8 text-sm px-2 ring-1 ring-gray-6 focus:ring-yellow-5 focus:outline-none"
        {...inputProps}
      />
    </div>
  );
}

export const Rpcs = RPCS;
