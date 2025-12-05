import { createStore } from "solid-js/store";
import { expect, it } from "vitest";

import { PaneLayout } from ".";

it("removePane", () => {
	{
		const [state, setState] = createStore<
			PaneLayout.PaneLayout<number> | PaneLayout.Empty
		>({
			variant: "horizontal",
			panes: [
				{ size: 1, variant: "single", pane: 0 },
				{
					variant: "vertical",
					panes: [
						{ variant: "single", pane: 1, size: 0.5 },
						{ variant: "single", pane: 2, size: 0.5 },
					],
					size: 1,
				},
				{ size: 1, variant: "single", pane: 3 },
			],
		});

		setState((state) => PaneLayout.removePane(state, 3));

		expect(state).toEqual({
			variant: "horizontal",
			panes: [
				{ size: 1, variant: "single", pane: 0 },
				{
					variant: "vertical",
					panes: [
						{ variant: "single", pane: 1, size: 0.5 },
						{ variant: "single", pane: 2, size: 0.5 },
					],
					size: 1,
				},
			],
		});
	}

	{
		const [state, setState] = createStore<
			PaneLayout.PaneLayout<number> | PaneLayout.Empty
		>({
			variant: "horizontal",
			panes: [
				{ size: 1, variant: "single", pane: 0 },
				{
					variant: "vertical",
					panes: [
						{ variant: "single", pane: 1, size: 0.5 },
						{ variant: "single", pane: 2, size: 0.5 },
					],
					size: 1,
				},
				{ size: 1, variant: "single", pane: 3 },
			],
		});

		setState((state) => PaneLayout.removePane(state, 1));

		expect(state).toEqual({
			variant: "horizontal",
			panes: [
				{ size: 1, variant: "single", pane: 0 },
				{ size: 1 / 3, variant: "single", pane: 2 },
				{ size: 1, variant: "single", pane: 3 },
			],
		});
	}
});
