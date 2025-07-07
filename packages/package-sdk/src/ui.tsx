import { RpcClient, RpcGroup } from "@effect/rpc";
import { cva, cx, VariantProps } from "cva";
import { Effect, Schema } from "effect";
import {
	Accessor,
	children,
	ComponentProps,
	createSignal,
	JSX,
	Show,
	splitProps,
	untrack,
} from "solid-js";
import createPresence from "solid-presence";
import GgSpinner from "~icons/gg/spinner";

export type GlobalAppState = {
	auth:
		| { state: "logged-out"; login: Effect.Effect<void> }
		| { state: "logged-in"; userId: string };
	logsPanelOpen: boolean;
};

export type SettingsProps<
	TRpcs extends RpcGroup.RpcGroup<any>,
	TState extends Schema.Schema<any>,
> = {
	globalState: GlobalAppState;
	rpc: RpcClient.RpcClient<RpcGroup.Rpcs<TRpcs>>;
	state: TState["Encoded"];
};

const buttonStyles = cva(
	"focus-visible:outline-yellow-5 outline-none focus-visible:outline-solid transition-colors",
	{
		variants: {
			variant: {
				primary:
					"bg-gray-12 text-gray-1 hover:bg-gray-11 disabled:bg-gray-10 outline-offset-3 focus-visible:outline-2",
				text: "bg-transparent text-gray-11 enabled:(hover:(text-gray-12 bg-gray-3) focus-visible:(text-gray-12 bg-gray-3 outline-offset-0 outline-1)) disabled:(text-gray-10 bg-gray-3)",
				textDanger:
					"bg-transparent text-red-10 enabled:(hover:bg-red-3 focus-visible:(bg-red-3 outline-offset-0 outline-1)) disabled:(text-red-9 bg-red-3)",
			},
			size: {
				md: "h-8 rounded px-2.5 y-1 text-sm",
			},
		},
		defaultVariants: {
			variant: "primary",
			size: "md",
		},
	},
);

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
	props: Omit<ComponentProps<typeof Button>, "onClick" | "children"> & {
		onClick?(e: MouseEvent): Effect.Effect<any, any>;
		children?: JSX.Element | ((loading: Accessor<boolean>) => JSX.Element);
	},
) {
	const [loading, setLoading] = createSignal(false);

	const child = children(() => {
		const child = props.children;
		return typeof child === "function" && child.length > 0
			? untrack(() => child(loading))
			: (child as JSX.Element);
	});

	const [ref, setRef] = createSignal<HTMLButtonElement | null>(null);
	const presence = createPresence({
		show: loading,
		element: ref,
	});

	return (
		<Button
			{...props}
			ref={setRef}
			class={cx(
				props.class,
				"relative overflow-hidden shrink-0 block children",
			)}
			disabled={props.disabled || loading()}
			onClick={(e) => {
				if (!props.onClick) return;
				const currentTarget = e.currentTarget;
				const t = setTimeout(() => setLoading(true), 30);
				Effect.runPromise(props.onClick(e)).finally(() => {
					clearTimeout(t);
					setLoading(false);
					if (document.activeElement === document.body) currentTarget.focus();
				});
			}}
		>
			{child()}
			<Show when={presence.present()}>
				<div
					ref={setRef}
					data-loading={loading()}
					style={{ "animation-duration": "100ms" }}
					class="absolute opacity-100 inset-0 flex items-center justify-center data-[loading='true']:(animate-in fade-in) data-[loading='false']:(animate-out fade-out) bg-inherit"
				>
					<GgSpinner class="size-5 text-inherit animate-spin" />
				</div>
			</Show>
		</Button>
	);
}
