import { Cause, Exit, Schema } from "effect";
import { Policy } from "@macrograph/server-domain";
import type { UseQueryResult } from "@tanstack/solid-query";
import type { Accessor, JSX } from "solid-js";

const isPolicyDenied = Schema.is(Policy.PolicyDeniedError);

export function MatchEffectQuery<D, E>(props: {
	query: UseQueryResult<Exit.Exit<D, E>>;
	onSuccess?: (data: Accessor<D>) => JSX.Element;
	onError?: (
		error: Cause.Cause<Exclude<E, Policy.PolicyDeniedError>>,
	) => JSX.Element;
}) {
	return (
		<>
			{props.query.data?.pipe(
				Exit.match({
					onSuccess: (data) => props.onSuccess?.(() => data),
					onFailure: (e) => (
						<div class="w-full border-red-9 border bg-red-2 text-red-9 p-2	text-center">
							{Cause.isFailType(e) && isPolicyDenied(e.error)
								? "Access Denied"
								: (props.onError?.(e as any) ?? "Unexpected Error Occurred")}
						</div>
					),
				}),
			)}
		</>
	);
}
