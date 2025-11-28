import type { RpcClient, RpcGroup } from "@effect/rpc";
import {
	type Effect,
	Exit,
	type ManagedRuntime,
	type Schema,
	Scope,
} from "effect";
import { createContextProvider } from "@solid-primitives/context";
import { cva, cx, type VariantProps } from "cva";
import {
	type Accessor,
	type ComponentProps,
	children,
	createEffect,
	createSignal,
	type JSX,
	onCleanup,
	Show,
	splitProps,
	untrack,
} from "solid-js";
import createPresence from "solid-presence";
import "@total-typescript/ts-reset";

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
	rpc: RpcClient.RpcClient<RpcGroup.Rpcs<TRpcs>>;
	state?: TState["Encoded"];
};

const buttonStyles = cva(
	{
		base: "focus-visible:outline-yellow-5 outline-none focus-visible:outline-solid transition-colors",
		variants: {
			variant: {
				primary:
					"bg-gray-12 text-gray-1 hover:bg-gray-11 disabled:bg-gray-10 outline-offset-3 focus-visible:outline-1.5",
				text: "bg-transparent text-gray-12 enabled:(hover:(text-gray-12 bg-gray-3) focus-visible:(text-gray-12 bg-gray-3 outline-offset-0 outline-1)) disabled:(text-gray-10 bg-gray-3)",
				textDanger:
					"bg-transparent text-red-10 enabled:(hover:bg-red-3 focus-visible:(bg-red-3 outline-offset-0 outline-1)) disabled:(text-red-9 bg-red-3)",
			},
			size: {
				md: "h-8 px-2.5 y-1 text-sm",
			},
			shape: {
				block: "h-full",
				rounded: "rounded",
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
	const [cvaProps, restProps] = splitProps(props, ["variant", "size", "shape"]);

	return (
		<button
			type="button"
			{...restProps}
			class={buttonStyles({ ...cvaProps, class: props.class })}
		/>
	);
}

const [EffectRuntimeProvider, _useEffectRuntime] = createContextProvider(
	(props: { runtime: ManagedRuntime.ManagedRuntime<any, any> }) =>
		props.runtime,
);
export { EffectRuntimeProvider };
export function useEffectRuntime() {
	const runtime = _useEffectRuntime();
	if (!runtime) {
		throw new Error(
			"useEffectRuntime must be used within an EffectRuntimeProvider",
		);
	}
	return runtime;
}

export function EffectButton(
	props: Omit<ComponentProps<typeof Button>, "onClick" | "children"> & {
		onClick?(e: MouseEvent): Effect.Effect<any, any>;
		children?: JSX.Element | ((loading: Accessor<boolean>) => JSX.Element);
	},
) {
	const runtime = useEffectRuntime();

	return (
		<PromiseButton
			{...props}
			onClick={(e) => props.onClick?.(e).pipe(runtime.runPromise)}
		/>
	);
}

export function PromiseButton(
	props: Omit<ComponentProps<typeof Button>, "onClick" | "children"> & {
		onClick?(e: MouseEvent): Promise<any> | undefined;
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
				const promise = props.onClick(e);
				if (!promise) return;
				const t = setTimeout(() => setLoading(true), 30);
				promise.finally(() => {
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
					<IconGgSpinner class="size-5 text-inherit animate-spin" />
				</div>
			</Show>
		</Button>
	);
}

export function createScopedEffect(
	effect: Accessor<Effect.Effect<any, any, Scope.Scope>>,
) {
	const runtime = useEffectRuntime();

	createEffect(() => {
		const scope = Scope.make().pipe(runtime.runSync);

		onCleanup(() => {
			Scope.close(scope, Exit.succeed<void>(undefined)).pipe(runtime.runFork);
		});

		effect().pipe(Scope.use(scope), runtime.runPromise);
	});
}

export function LoadingSpinner() {
	return <IconGgSpinner class="size-5 text-inherit animate-spin" />;
}

export function LoadingBlock() {
	return (
		<div class="w-full p-4 flex items-center justify-center">
			<LoadingSpinner />
		</div>
	);
}
