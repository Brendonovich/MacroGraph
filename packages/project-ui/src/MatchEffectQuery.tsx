import { Cause, Exit, Schema } from "effect";
import { Policy } from "@macrograph/project-domain";
import type { UseQueryResult } from "@tanstack/solid-query";
import { type Accessor, type JSX, Match, Switch } from "solid-js";

const isPolicyDenied = Schema.is(Policy.PolicyDeniedError);

export function MatchEffectQuery<D, E>(props: {
	query: UseQueryResult<Exit.Exit<D, E>>;
	onSuccess?: (data: Accessor<D>) => JSX.Element;
	onError?: (
		error: Cause.Cause<Exclude<E, Policy.PolicyDeniedError>>,
	) => JSX.Element;
}) {
	return (
		<Switch>
			<Match
				when={
					props.query.data &&
					Exit.isSuccess(props.query.data) &&
					props.query.data
				}
			>
				{(data) => props.onSuccess?.(() => data().value)}
			</Match>
			<Match
				when={
					props.query.data &&
					Exit.isFailure(props.query.data) &&
					props.query.data
				}
			>
				{(data) => (
					<div class="w-full border-red-9 border bg-red-2 text-red-9 p-2	text-center">
						{(() => {
							const c = data().cause;
							return Cause.isFailType(c) && isPolicyDenied(c.error);
						})()
							? "Access Denied"
							: (props.onError?.(data().cause as any) ??
								"Unexpected Error Occurred")}
					</div>
				)}
			</Match>
		</Switch>
	);
}
