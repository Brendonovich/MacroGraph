import { RpcClient, RpcGroup } from "@effect/rpc";
import { cva, cx, VariantProps } from "cva";
import { Effect, Schema } from "effect";
import { ComponentProps, createSignal, splitProps } from "solid-js";

export type GlobalAppState = {
  auth:
    | { state: "logged-out"; login: Effect.Effect<void> }
    | { state: "logged-in"; userId: string };
};

export type SettingsProps<
  TRpcs extends RpcGroup.RpcGroup<any>,
  TState extends Schema.Schema<any>,
> = {
  globalState: GlobalAppState;
  rpc: RpcClient.RpcClient<RpcGroup.Rpcs<TRpcs>>;
  state: TState["Encoded"];
};

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

export function Button(
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

export function EffectButton(
  props: Omit<ComponentProps<typeof Button>, "onClick"> & {
    onClick?(e: MouseEvent): Effect.Effect<any, any>;
  },
) {
  const [loading, setLoading] = createSignal(false);

  return (
    <Button
      {...props}
      class={cx(props.class, "relative overflow-hidden")}
      disabled={props.disabled ?? loading()}
      onClick={(e) => {
        if (!props.onClick) return;
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
