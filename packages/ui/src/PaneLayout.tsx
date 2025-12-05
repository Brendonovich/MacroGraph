import { cx } from "cva";
import { type Accessor, For, type JSX, Match, Switch } from "solid-js";
import { produce, reconcile } from "solid-js/store";

export namespace PaneLayout {
	export type Empty = { variant: "empty" };

	export type PaneLayout<T> =
		| { variant: "single"; pane: T }
		| {
				variant: "horizontal" | "vertical";
				panes: Array<PaneLayout<T> & { size: number }>;
		  };

	export function removePane<T>(state: PaneLayout<T> | Empty, id: number) {
		const recurse = (
			paneLayout: PaneLayout<T> | Empty,
		): PaneLayout<T> | undefined => {
			if (paneLayout.variant === "empty" || paneLayout.variant === "single")
				return;

			for (let i = 0; i < paneLayout.panes.length; i++) {
				const pane = paneLayout.panes[i];
				if (!pane) continue;

				if (pane.variant === "single") {
					if (pane.pane === id)
						if (paneLayout.panes.length > 2) {
							paneLayout.panes.splice(i, 1);
						} else {
							return paneLayout.panes.find((_, _i) => _i !== i);
						}
				} else {
					const v = recurse(pane);
					console.log({ v });
					if (!v) continue;
					paneLayout.panes[i] = { ...v, size: 1 / paneLayout.panes.length };
					return;
				}
			}
		};

		if (state.variant === "empty") return state;
		if (state.variant === "single")
			return reconcile({ variant: "empty" } as Empty)(state);

		if (state.panes.find((p) => p.variant === "single" && p.pane === id)) {
			const remaining = state.panes.filter(
				(p) => !(p.variant === "single" && p.pane === id),
			);

			if (remaining.length > 1)
				return reconcile({
					...state,
					panes: remaining,
				})(state);

			if (remaining.length > 0) return reconcile(remaining[0]!)(state);

			return reconcile({ variant: "empty" } as Empty)(state);
		}

		return produce(recurse)(state) ?? state;
	}

	export function splitPane(
		state: PaneLayout<number> | Empty,
		direction: "horizontal" | "vertical",
		id: number,
		newId: number,
		onSuccess: () => void,
	) {
		const recurse = (
			paneLayout: PaneLayout<number> | { variant: "empty" },
		): PaneLayout<number> | undefined => {
			if (paneLayout.variant === "empty") return;
			if (paneLayout.variant === "single") {
				if (paneLayout.pane !== id) return;

				onSuccess();

				return {
					variant: direction,
					panes: [
						{ variant: "single", pane: paneLayout.pane, size: 0.5 },
						{ variant: "single", pane: newId, size: 0.5 },
					],
				};
			}

			for (let i = 0; i < paneLayout.panes.length; i++) {
				const innerPane = paneLayout.panes[i]!;
				if (innerPane?.variant === "single") {
					if (innerPane.pane !== id) continue;
					if (paneLayout.variant === direction) {
						onSuccess();

						paneLayout.panes.splice(i + 1, 0, {
							variant: "single",
							pane: newId,
							size: 1,
						});
					} else {
						const v = recurse(innerPane);
						if (!v) continue;
						paneLayout.panes[i] = { ...v, size: 1 };
					}
				} else {
					const v = recurse(innerPane);
					if (!v) continue;
					paneLayout.panes[i] = { ...v, size: 1 };
				}

				paneLayout.panes.forEach((p) => {
					p.size = 1 / paneLayout.panes.length;
				});

				return;
			}
		};

		if (state.variant === "empty" || state.variant === "single") {
			const ret = recurse(state);
			if (ret === undefined) return state;
			return reconcile(ret)(state);
		} else return produce(recurse)(state) ?? state;
	}
}

export function PaneLayoutView<T>(props: {
	state: PaneLayout.PaneLayout<T> | PaneLayout.Empty;
	children: (pane: Accessor<T>) => JSX.Element;
}) {
	return (
		<Switch>
			<Match when={props.state.variant === "single" && props.state}>
				{(layout) => props.children(() => layout().pane)}
			</Match>
			<Match
				when={
					(props.state.variant === "horizontal" ||
						props.state.variant === "vertical") &&
					props.state
				}
			>
				{(layout) => (
					<div
						class={cx(
							"flex flex-1 divide-gray-5",
							layout().variant === "vertical"
								? "flex-col divide-y"
								: "flex-row divide-x overflow-x-hidden",
						)}
					>
						<For each={layout().panes}>
							{(pane) => (
								<PaneLayoutView<T> state={pane}>
									{props.children}
								</PaneLayoutView>
							)}
						</For>
					</div>
				)}
			</Match>
		</Switch>
	);
}
