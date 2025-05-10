import { ComponentProps, createSignal, For, Show, splitProps } from "solid-js";
import { Effect } from "effect";
import { cva, cx, VariantProps } from "cva";
import SvgSpinners180Ring from "~icons/svg-spinners/180-ring";
import createPresence from "solid-presence";

import { RPCS, STATE } from "./rpc";
import { SettingsProps } from "../package-settings-utils";
import { createStore } from "solid-js/store";

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
    <div class="p-4 gap-4 flex flex-col max-w-2xl text-sm">
      <AddSocketForm {...props} />
      <ul class="rounded border border-gray-6 divide-y divide-gray-6">
        <For
          each={props.state.connections}
          fallback={
            <div class="text-center p-3 text-gray-11 italic">No Sockets</div>
          }
        >
          {(conn) => <SocketListItem {...props} conn={conn} />}
        </For>
      </ul>
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
    <li class="flex flex-row p-2 w-full">
      <div class="flex flex-col space-y-0.5 pl-1">
        <pre>{conn().address}</pre>
        <div class="flex flex-row items-center gap-2">
          <div
            class={cx(
              "size-1.5 rounded-full",
              CONNECTION_INDICATOR[conn().state].class,
            )}
          />
          <span class="italic text-gray-11">
            {CONNECTION_INDICATOR[conn().state].label}
          </span>
        </div>
      </div>
      <div class="flex-1 flex flex-row justify-end items-center gap-1">
        <EffectButton
          variant="text"
          disabled={conn().state === "connecting"}
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
    <div class="flex flex-col gap-1 flex-1">
      <label class="font-medium text-sm">{labelProps.label}</label>
      <input
        class="bg-white/85 dark:bg-black/25 h-8 text-sm px-2 ring-1 rounded ring-gray-7 focus:ring-yellow-5 focus:ring-2 outline-none"
        {...inputProps}
      />
    </div>
  );
}

const buttonStyles = cva("focus-visible:outline-yellow-5 outline-none", {
  variants: {
    variant: {
      primary:
        "bg-gray-12 text-gray-1 hover:bg-gray-11 disabled:bg-gray-11 outline-offset-3 focus-visible:outline-2",
      text: "bg-transparent text-gray-11 enabled:(hover:(text-gray-12 bg-gray-3) focus-visible:(text-gray-12 bg-gray-3 outline-offset-0 outline-1)) disabled:text-gray-10",
      textDanger:
        "bg-transparent text-red-10 enabled:(hover:bg-red-3 focus-visible:(bg-red-3 outline-offset-0 outline-1)) disabled:text-gray-10",
    },
    size: {
      md: "h-8 rounded px-2.5 y-1 text-sm",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

function Button(
  props: VariantProps<typeof buttonStyles> & ComponentProps<"button">,
) {
  const [cvaProps, restProps] = splitProps(props, ["variant", "size"]);

  return (
    <button
      type="button"
      {...restProps}
      class={buttonStyles({ ...cvaProps, class: props.class })}
    />
  );
}

function EffectButton(
  props: Omit<ComponentProps<typeof Button>, "onClick"> & {
    onClick(e: MouseEvent): Effect.Effect<any, any>;
  },
) {
  const [loading, setLoading] = createSignal(false);

  // const [ref, setRef] = createSignal<HTMLButtonElement | null>(null);
  // const { present } = createPresence({
  //   show: loading,
  //   element: ref,
  // });

  return (
    <Button
      {...props}
      class={cx(props.class, "relative overflow-hidden")}
      disabled={props.disabled ?? loading()}
      onClick={(e) => {
        setLoading(true);
        Effect.runPromise(props.onClick(e)).finally(() => setLoading(false));
      }}
    >
      {/* <Show when={present()}>
        <div
          ref={setRef}
          data-visible={loading()}
          class="absolute inset-0 bg-inherit data-[visible='true']:(animate-in fade-in) data-[visible='false']:(animate-out fade-out) duration-100"
        >
          <SvgSpinners180Ring class="absolute inset-1/2 -translate-1/2" />
        </div>
      </Show> */}
      {props.children}
    </Button>
  );
}
