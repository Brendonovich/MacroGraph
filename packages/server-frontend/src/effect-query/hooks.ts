import { useEffectRuntime } from "@macrograph/package-sdk/ui";
import type {
	MutateOptions,
	QueryFunctionContext,
	QueryKey,
	SkipToken,
	SolidMutationOptions,
	UseMutationResult,
	SolidQueryOptions,
	UseQueryResult,
} from "@tanstack/solid-query";
import {
	skipToken,
	useMutation as createMutation,
	useQuery as createQuery,
} from "@tanstack/solid-query";
import { ManagedRuntime, Scope } from "effect";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Either from "effect/Either";
import * as Exit from "effect/Exit";

import { createEffect, onCleanup, onMount, type Accessor } from "solid-js";

type Override<TTargetA, TTargetB> = {
	[AKey in keyof TTargetA]: AKey extends keyof TTargetB
		? TTargetB[AKey]
		: TTargetA[AKey];
};

export function makeUseEffectQuery<
	R,
	MR extends ManagedRuntime.ManagedRuntime<R, any>,
>(useEffectRuntime: () => MR) {
	return function useEffectQuery<
		TData,
		TError,
		ThrowOnDefect extends boolean = false,
		TExposedError = ThrowOnDefect extends true ? TError : Cause.Cause<TError>,
		TQueryKey extends QueryKey = QueryKey,
	>(
		options: Accessor<
			{
				throwOnDefect?: ThrowOnDefect;
			} & Override<
				SolidQueryOptions<TData, TExposedError, TData, TQueryKey>,
				{
					queryFn?:
						| ((
								context: QueryFunctionContext<TQueryKey, never>,
						  ) => Effect.Effect<TData, TError, R>)
						| SkipToken;
				}
			>
		>,
	): UseQueryResult<TData, TExposedError> {
		const runtime = useEffectRuntime();
		// Use the ManagedRuntime's own runPromiseExit method directly
		const runPromiseExit = runtime.runPromiseExit.bind(runtime);

		const baseResults = createQuery(() => {
			const opts = options() as any;
			const throwOnDefect = opts.throwOnDefect ?? false;
			const queryFn = opts.queryFn;
			const throwOnError = opts.throwOnError;

			const processedOptions: any = {
				...opts,
			};

			if (typeof queryFn === "function") {
				processedOptions.queryFn = async (
					args: QueryFunctionContext<TQueryKey, never>,
				) => {
					let queryEffect: Effect.Effect<TData, TError, R>;
					try {
						queryEffect = queryFn(args);
					} catch (e) {
						throw new Cause.UnknownException(e, "queryFn threw");
					}

					if ((queryEffect as any) === skipToken) {
						return skipToken as any;
					}

					const result = await runPromiseExit(queryEffect, {
						signal: args.signal,
					});
					if (Exit.isFailure(result)) {
						throw result.cause;
					} else {
						return result.value;
					}
				};
			}

			if (typeof throwOnError === "function") {
				processedOptions.throwOnError = (error: any, query: any) => {
					const cause = error as Cause.Cause<TError> | Cause.UnknownException;

					if (Cause.isUnknownException(cause)) {
						return true;
					}
					const failureOrCause = Cause.failureOrCause(cause);

					if (throwOnDefect) {
						if (Either.isLeft(failureOrCause)) {
							const exposedError =
								failureOrCause.left as unknown as TExposedError;
							return throwOnError(exposedError, query);
						} else {
							return true;
						}
					} else {
						const exposedError = cause as unknown as TExposedError;
						return throwOnError(exposedError, query);
					}
				};
			}

			return processedOptions;
		});

		// In Solid.js, we only need to transform error properties, not add reactivity
		const opts = options();
		const throwOnDefect = opts.throwOnDefect ?? false;

		// Only use Proxy if we need to transform errors
		if (throwOnDefect) {
			const resultsProxy = new Proxy(baseResults, {
				get: (target, prop, receiver) => {
					if (prop === "error") {
						const error = target.error;
						return error
							? Either.match(
									Cause.failureOrCause(error as unknown as Cause.Cause<TError>),
									{
										onLeft: (error) => error as unknown as TExposedError,
										onRight: (_cause) => {
											throw new Error(
												"non fail cause with throwOnDefect: true should have thrown already",
											);
										},
									},
								)
							: null;
					} else if (prop === "failureReason") {
						const failureReason = target.failureReason;
						return failureReason
							? Either.match(
									Cause.failureOrCause(
										failureReason as unknown as Cause.Cause<TError>,
									),
									{
										onLeft: (error) => error as unknown as TExposedError,
										onRight: (_cause) => {
											throw new Error(
												"non fail cause with throwOnDefect: true should have thrown already",
											);
										},
									},
								)
							: null;
					}

					return Reflect.get(target, prop, receiver);
				},
			});

			return resultsProxy as UseQueryResult<TData, TExposedError>;
		}

		// No transformation needed, return base results directly
		return baseResults as UseQueryResult<TData, TExposedError>;
	};
}

export function makeUseEffectMutation<
	R,
	MR extends ManagedRuntime.ManagedRuntime<R, any>,
>(useEffectRuntime: () => MR) {
	return function useEffectMutation<
		TData,
		TError,
		ThrowOnDefect extends boolean = false,
		TExposedError = ThrowOnDefect extends true ? TError : Cause.Cause<TError>,
		TVariables = void,
		TContext = unknown,
	>(
		options: Accessor<
			{
				throwOnDefect?: ThrowOnDefect;
			} & Override<
				Omit<
					SolidMutationOptions<TData, TExposedError, TVariables, TContext>,
					"retry" | "retryDelay"
				>,
				{
					mutationFn?: (
						variables: TVariables,
					) => Effect.Effect<TData, TError, R>;
					onMutate?: (
						variables: TVariables,
					) => Effect.Effect<TContext, unknown, R>;
					onSuccess?: (
						data: TData,
						variables: TVariables,
						context: TContext,
					) => Effect.Effect<unknown, unknown, R>;
					onError?: (
						error: TExposedError,
						variables: TVariables,
						context: TContext | undefined,
					) => Effect.Effect<unknown, unknown, R>;
					onSettled?: (
						data: TData | undefined,
						error: TExposedError | null,
						variables: TVariables,
						context: TContext | undefined,
					) => Effect.Effect<unknown, unknown, R>;
				}
			>
		>,
	): Override<
		UseMutationResult<TData, TExposedError, TVariables, TContext>,
		{
			mutateAsync: (
				variables: TVariables,
				options?: MutateOptions<
					TData,
					Cause.Cause<TError>,
					TVariables,
					TContext
				>,
			) => Promise<Exit.Exit<TData, TError>>;
			mutate: (
				variables: TVariables,
				options?: MutateOptions<
					TData,
					Cause.Cause<TError>,
					TVariables,
					TContext
				>,
			) => void;
		}
	> {
		const runtime = useEffectRuntime();
		// Use the ManagedRuntime's own methods directly
		const runPromiseExit = runtime.runPromiseExit.bind(runtime);
		const runPromise = runtime.runPromise.bind(runtime);

		const baseResults = createMutation(() => {
			const opts = options() as any;
			const mutationFn = opts.mutationFn;
			const throwOnDefect = opts.throwOnDefect ?? false;
			const throwOnError = opts.throwOnError;
			const onMutate = opts.onMutate;
			const onSuccess = opts.onSuccess;
			const onError = opts.onError;
			const onSettled = opts.onSettled;

			const processedOptions: any = {
				...opts,
			};

			if (typeof mutationFn === "function") {
				processedOptions.mutationFn = async (variables: TVariables) => {
					let mutationEffect: Effect.Effect<TData, TError, R>;
					try {
						mutationEffect = mutationFn(variables);
					} catch (e) {
						throw new Cause.UnknownException(e, "mutationFn threw");
					}
					const result = await runPromiseExit(mutationEffect);
					if (Exit.isFailure(result)) {
						throw result.cause;
					} else {
						return result.value;
					}
				};
			}

			if (typeof throwOnError === "function") {
				processedOptions.throwOnError = (error: any) => {
					const cause = error as Cause.Cause<TError> | Cause.UnknownException;

					if (Cause.isUnknownException(cause)) {
						return true;
					}

					const failureOrCause = Cause.failureOrCause(cause);

					if (throwOnDefect) {
						if (Either.isLeft(failureOrCause)) {
							const exposedError =
								failureOrCause.left as unknown as TExposedError;
							return throwOnError(exposedError);
						} else {
							return true;
						}
					} else {
						const exposedError = cause as unknown as TExposedError;
						return throwOnError(exposedError);
					}
				};
			}

			if (typeof onMutate === "function") {
				processedOptions.onMutate = async (...args: [TVariables]) => {
					return await runPromise(
						onMutate(...args).pipe(
							Effect.withSpan("useEffectMutation.onMutate", {
								attributes: {
									mutationFn: mutationFn?.toString(),
								},
							}),
						),
					);
				};
			}

			if (typeof onSuccess === "function") {
				processedOptions.onSuccess = async (
					...args: [TData, TVariables, TContext]
				) => {
					return await runPromise(
						onSuccess(...args).pipe(
							Effect.withSpan("useEffectMutation.onSuccess", {
								attributes: {
									mutationFn: mutationFn?.toString(),
								},
							}),
						),
					);
				};
			}

			if (typeof onError === "function") {
				processedOptions.onError = async (
					baseError: any,
					...args: [TVariables, TContext | undefined]
				) => {
					const error = throwOnDefect
						? Either.match(
								Cause.failureOrCause(baseError as Cause.Cause<TError>),
								{
									onLeft: (error) => error as unknown as TExposedError,
									onRight: (_cause) => {
										throw new Error(
											"non fail cause with throwOnDefect: true should have thrown already",
										);
									},
								},
							)
						: (baseError as unknown as TExposedError);

					return await runPromise(
						onError(error, ...args).pipe(
							Effect.withSpan("useEffectMutation.onError", {
								attributes: {
									mutationFn: mutationFn?.toString(),
								},
							}),
						),
					);
				};
			}

			if (typeof onSettled === "function") {
				processedOptions.onSettled = async (
					data: TData | undefined,
					baseError: any,
					...args: [TVariables, TContext | undefined]
				) => {
					const error = baseError
						? throwOnDefect
							? Either.match(
									Cause.failureOrCause(baseError as Cause.Cause<TError>),
									{
										onLeft: (error) => error as unknown as TExposedError,
										onRight: (_cause) => {
											throw new Error(
												"non fail cause with throwOnDefect: true should have thrown already",
											);
										},
									},
								)
							: (baseError as unknown as TExposedError)
						: null;

					return await runPromise(
						onSettled(data, error, ...args).pipe(
							Effect.withSpan("useEffectMutation.onSettled", {
								attributes: {
									mutationFn: mutationFn?.toString(),
								},
							}),
						),
					);
				};
			}

			return processedOptions;
		});

		// In Solid.js, we only need to transform error properties and mutate methods
		const opts = options();
		const throwOnDefect = opts.throwOnDefect ?? false;

		// We always need a proxy for mutations to wrap mutate/mutateAsync
		const resultsProxy = new Proxy(baseResults, {
			get: (target, prop, receiver) => {
				if (throwOnDefect) {
					if (prop === "error") {
						const error = target.error;
						return error
							? Either.match(
									Cause.failureOrCause(error as unknown as Cause.Cause<TError>),
									{
										onLeft: (error) => error as unknown as TExposedError,
										onRight: (_cause) => {
											throw new Error(
												"non fail cause with throwOnDefect: true should have thrown already",
											);
										},
									},
								)
							: null;
					} else if (prop === "failureReason") {
						const failureReason = target.failureReason;
						return failureReason
							? Either.match(
									Cause.failureOrCause(
										failureReason as unknown as Cause.Cause<TError>,
									),
									{
										onLeft: (error) => error as unknown as TExposedError,
										onRight: (_cause) => {
											throw new Error(
												"non fail cause with throwOnDefect: true should have thrown already",
											);
										},
									},
								)
							: null;
					}
				}

				if (prop === "mutate") {
					return (variables: any, options?: any) => {
						return target.mutate(variables, options);
					};
				} else if (prop === "mutateAsync") {
					return (variables: any, options?: any) =>
						target
							.mutateAsync(variables, options)
							.then((res) => Exit.succeed(res))
							.catch((cause: Cause.Cause<TError>) =>
								Exit.fail(cause),
							) as Promise<Exit.Exit<TData, TError>>;
				}

				return Reflect.get(target, prop, receiver);
			},
		});

		return resultsProxy as Override<
			UseMutationResult<TData, TExposedError, TVariables, TContext>,
			{
				mutateAsync: (
					variables: TVariables,
					options?: MutateOptions<
						TData,
						Cause.Cause<TError>,
						TVariables,
						TContext
					>,
				) => Promise<Exit.Exit<TData, TError>>;
				mutate: (
					variables: TVariables,
					options?: MutateOptions<
						TData,
						Cause.Cause<TError>,
						TVariables,
						TContext
					>,
				) => void;
			}
		>;
	};
}

export function createScopedEffect(
	effect: Accessor<Effect.Effect<any, any, Scope.Scope>>,
) {
	const runtime = useEffectRuntime();

	createEffect(() => {
		const scope = Scope.make().pipe(runtime.runSync);

		onCleanup(() => {
			Scope.close(scope, Exit.succeed<void>(undefined)).pipe(runtime.runSync);
		});

		effect().pipe(Scope.use(scope), runtime.runPromise);
	});
}
