import type { UseQueryResult } from "@tanstack/solid-query";
import type { Cause } from "effect";
import { type Accessor, type JSX, Switch } from "solid-js";
import { Match } from "solid-js";

export function MatchEffectQuery<D, E>(props: {
	query: UseQueryResult<D, Cause.Cause<E>>;
	onSuccess?: (data: Accessor<D>) => JSX.Element;
	onError?: (error: Cause.Cause<E>) => JSX.Element;
}) {
	return (
		<Switch>
			<Match when={props.query.status === "error" && props.query} keyed>
				{(query) => props.onError?.(query.error)}
			</Match>
			<Match when={props.query.status === "success" && props.query} keyed>
				{(query) => props.onSuccess?.(() => query.data)}
			</Match>
		</Switch>
	);
}
