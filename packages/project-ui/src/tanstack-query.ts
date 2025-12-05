import type {
	DefaultError,
	SolidMutationOptions,
	WithRequired,
} from "@tanstack/solid-query";

export function mutationOptions<
	TData = unknown,
	TError = DefaultError,
	TVariables = void,
	TContext = unknown,
>(
	options: WithRequired<
		SolidMutationOptions<TData, TError, TVariables, TContext>,
		"mutationKey"
	>,
): WithRequired<
	SolidMutationOptions<TData, TError, TVariables, TContext>,
	"mutationKey"
>;
export function mutationOptions<
	TData = unknown,
	TError = DefaultError,
	TVariables = void,
	TContext = unknown,
>(
	options: Omit<
		SolidMutationOptions<TData, TError, TVariables, TContext>,
		"mutationKey"
	>,
): Omit<
	SolidMutationOptions<TData, TError, TVariables, TContext>,
	"mutationKey"
>;
export function mutationOptions<
	TData = unknown,
	TError = DefaultError,
	TVariables = void,
	TContext = unknown,
>(
	options: SolidMutationOptions<TData, TError, TVariables, TContext>,
): SolidMutationOptions<TData, TError, TVariables, TContext> {
	return options;
}
