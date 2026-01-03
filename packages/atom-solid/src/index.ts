/**
 * @since 1.0.0
 */
import type * as Atom from "@effect-atom/atom/Atom";
import type * as AtomRef from "@effect-atom/atom/AtomRef";
import * as Registry from "@effect-atom/atom/Registry";
import * as Result from "@effect-atom/atom/Result";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { globalValue } from "effect/GlobalValue";
import * as Solid from "solid-js";

/**
 * @since 1.0.0
 * @category modules
 */
export * as Registry from "@effect-atom/atom/Registry";

/**
 * @since 1.0.0
 * @category modules
 */
export * as Result from "@effect-atom/atom/Result";

/**
 * @since 1.0.0
 * @category modules
 */
export * as Atom from "@effect-atom/atom/Atom";

/**
 * @since 1.0.0
 * @category modules
 */
export * as AtomRef from "@effect-atom/atom/AtomRef";

/**
 * @since 1.0.0
 * @category re-exports
 */
export * as AtomHttpApi from "@effect-atom/atom/AtomHttpApi";

/**
 * @since 1.0.0
 * @category modules
 */
export * as AtomRpc from "@effect-atom/atom/AtomRpc";

/**
 * @since 1.0.0
 * @category registry
 */
export const defaultRegistry: Registry.Registry = globalValue(
	"@effect-atom/atom-solid/defaultRegistry",
	() => Registry.make(),
);

export const RegistryContext =
	Solid.createContext<Registry.Registry>(defaultRegistry);

const useAtomValueSignal = <A extends Atom.Atom<any>>(atom: () => A) => {
	const registry = Solid.useContext(RegistryContext);
	const [value, setValue] = Solid.createSignal(undefined as any as A);
	Solid.createEffect(() => {
		registry.subscribe(
			atom(),
			(nextValue) => {
				setValue(nextValue);
			},
			{ immediate: true },
		);
	});
	return [value as Solid.Accessor<Atom.Type<A>>, atom, registry] as const;
};

export const useAtomResource = <A, E>(
	atom: () => Atom.Atom<Result.Result<A, E>>,
) => {
	const registry = Solid.useContext(RegistryContext);

	let pendingValue:
		| { variant: "promise"; value: Promise<A> }
		| { variant: "res-rej"; res: (v: A) => void; rej: (e: unknown) => void }
		| undefined;
	const [value, actions] = Solid.createResource(() => {
		if (pendingValue?.variant === "promise") return pendingValue.value;

		return new Promise<A>((res, rej) => {
			pendingValue = { variant: "res-rej", res, rej };
		});
	});

	Solid.createEffect(() => {
		registry.subscribe(
			atom(),
			(nextValue) => {
				if (nextValue._tag === "Initial") return;
				if (pendingValue?.variant === "res-rej") {
					if (nextValue._tag === "Success") pendingValue.res(nextValue.value);
					else pendingValue.rej(nextValue.cause);
				} else {
					pendingValue = {
						variant: "promise",
						value:
							nextValue._tag === "Success"
								? Promise.resolve(nextValue.value)
								: Promise.reject(nextValue.cause),
					};
					actions.refetch();
				}
			},
			{ immediate: true },
		);
	});

	return [value, actions] as const;
};

/**
 * @since 1.0.0
 * @category composables
 */
export const useAtom = <
	R,
	W,
	Mode extends "value" | "promise" | "promiseExit" = never,
>(
	atom: () => Atom.Writable<R, W>,
	options?: {
		readonly mode?:
			| ([R] extends [Result.Result<any, any>] ? Mode : "value")
			| undefined;
	},
): readonly [
	Readonly<Solid.Accessor<R>>,
	write: "promise" extends Mode
		? (value: W) => Promise<Result.Result.Success<R>>
		: "promiseExit" extends Mode
			? (
					value: W,
				) => Promise<
					Exit.Exit<Result.Result.Success<R>, Result.Result.Failure<R>>
				>
			: (value: W | ((value: R) => W)) => void,
] => {
	const [value, atomRef, registry] = useAtomValueSignal(atom);
	return [
		value as Readonly<Solid.Accessor<R>>,
		setAtom(registry, atomRef, options),
	];
};

/**
 * @since 1.0.0
 * @category composables
 */
export const useAtomValue = <A>(atom: () => Atom.Atom<A>): Solid.Accessor<A> =>
	useAtomValueSignal(atom)[0];

const flattenExit = <A, E>(exit: Exit.Exit<A, E>): A => {
	if (Exit.isSuccess(exit)) return exit.value;
	throw Cause.squash(exit.cause);
};

function setAtom<
	R,
	W,
	Mode extends "value" | "promise" | "promiseExit" = never,
>(
	registry: Registry.Registry,
	atomRef: Solid.Accessor<Atom.Writable<R, W>>,
	options?: {
		readonly mode?:
			| ([R] extends [Result.Result<any, any>] ? Mode : "value")
			| undefined;
	},
): "promise" extends Mode
	? (
			value: W,
			options?: { readonly signal?: AbortSignal | undefined } | undefined,
		) => Promise<Result.Result.Success<R>>
	: "promiseExit" extends Mode
		? (
				value: W,
				options?: { readonly signal?: AbortSignal | undefined } | undefined,
			) => Promise<
				Exit.Exit<Result.Result.Success<R>, Result.Result.Failure<R>>
			>
		: (value: W | ((value: R) => W)) => void {
	if (options?.mode === "promise" || options?.mode === "promiseExit") {
		return ((value: W, opts?: any) => {
			registry.set(atomRef(), value);
			const promise = Effect.runPromiseExit(
				Registry.getResult(
					registry,
					atomRef() as Atom.Atom<Result.Result<any, any>>,
					{ suspendOnWaiting: true },
				),
				opts,
			);
			return options!.mode === "promise" ? promise.then(flattenExit) : promise;
		}) as any;
	}
	return ((value: W | ((value: R) => W)) => {
		registry.set(
			atomRef(),
			typeof value === "function"
				? (value as any)(registry.get(atomRef()))
				: value,
		);
	}) as any;
}

/**
 * @since 1.0.0
 * @category composables
 */
export const useAtomSet = <
	R,
	W,
	Mode extends "value" | "promise" | "promiseExit" = never,
>(
	atom: () => Atom.Writable<R, W>,
	options?: {
		readonly mode?:
			| ([R] extends [Result.Result<any, any>] ? Mode : "value")
			| undefined;
	},
): "promise" extends Mode
	? (
			value: W,
			options?: { readonly signal?: AbortSignal | undefined } | undefined,
		) => Promise<Result.Result.Success<R>>
	: "promiseExit" extends Mode
		? (
				value: W,
				options?: { readonly signal?: AbortSignal | undefined } | undefined,
			) => Promise<
				Exit.Exit<Result.Result.Success<R>, Result.Result.Failure<R>>
			>
		: (value: W | ((value: R) => W)) => void => {
	const registry = Solid.useContext(RegistryContext);
	Solid.createEffect(() => {
		Solid.onCleanup(registry.mount(atom()));
	});
	return setAtom(registry, atom, options);
};

/**
 * @since 1.0.0
 * @category composables
 */
export const useAtomRef = <A>(
	atomRef: () => AtomRef.ReadonlyRef<A>,
): Solid.Accessor<A> => {
	const [value, setValue] = Solid.createSignal<A>(atomRef().value);
	Solid.createEffect(() => {
		Solid.onCleanup(
			atomRef().subscribe((next) => {
				setValue(() => next);
			}),
		);
	});
	return value as Solid.Accessor<A>;
};
