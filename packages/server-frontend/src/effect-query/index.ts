import { Context, Effect, Layer, ManagedRuntime } from "effect";
import {
	createComponent,
	createContext,
	onCleanup,
	type ParentComponent,
	useContext,
} from "solid-js";

import * as Hooks from "./hooks";

// Memoize layer construction across all calls to `ManagedRuntime.make`
const memoMap = Effect.runSync(Layer.makeMemoMap);

export class QueryClient extends Context.Tag("@solid-effect-query/QueryClient")<
	QueryClient,
	any // We'll use the actual TanStack QueryClient type later
>() {}

interface EffectQuery<
	R,
	E,
	Args extends Record<string, unknown> = Record<string, unknown>,
> {
	Provider: ParentComponent<Args>;
	useEffectRuntime: () => ManagedRuntime.ManagedRuntime<R, E>;
	useEffectQuery: ReturnType<
		typeof Hooks.makeUseEffectQuery<R, ManagedRuntime.ManagedRuntime<R, E>>
	>;
	useEffectMutation: ReturnType<
		typeof Hooks.makeUseEffectMutation<R, ManagedRuntime.ManagedRuntime<R, E>>
	>;
}

export function makeEffectQuery<
	R,
	E,
	Args extends Record<string, unknown> = Record<string, unknown>,
>(layer: (options: Args) => Layer.Layer<R, E>): EffectQuery<R, E, Args> {
	const RuntimeContext = createContext<ManagedRuntime.ManagedRuntime<
		R,
		E
	> | null>(null);

	const useEffectRuntime = () => {
		const runtime = useContext(RuntimeContext);
		if (!runtime) {
			throw new Error(
				"useEffectRuntime must be used within an EffectRuntimeProvider",
			);
		}
		return runtime;
	};

	const useEffectQuery = Hooks.makeUseEffectQuery<
		R,
		ManagedRuntime.ManagedRuntime<R, E>
	>(useEffectRuntime);
	const useEffectMutation = Hooks.makeUseEffectMutation<
		R,
		ManagedRuntime.ManagedRuntime<R, E>
	>(useEffectRuntime);

	const Provider: ParentComponent<Args> = (props) => {
		// Extract only non-children props for dependency tracking
		const deps: unknown[] = [];
		for (const key of Object.keys(props).sort()) {
			if (key === "children") continue;
			deps.push(props[key]);
		}

		// Create runtime with memoization
		const runtime = (props.runtime ??
			ManagedRuntime.make(
				layer(props as Args),
				memoMap,
			)) as ManagedRuntime.ManagedRuntime<any, any>;

		// Dispose runtime on unmount
		onCleanup(() => {
			runtime.dispose();
		});

		return createComponent(RuntimeContext.Provider, {
			value: runtime,
			get children() {
				return props.children;
			},
		});
	};

	return {
		Provider,
		useEffectRuntime,
		useEffectQuery,
		useEffectMutation,
	};
}

// Re-export from hooks
export { makeUseEffectMutation, makeUseEffectQuery } from "./hooks";
