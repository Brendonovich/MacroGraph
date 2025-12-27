import { Option } from "effect";
import type { Graph } from "@macrograph/project-domain";
import type { TabLayout } from "@macrograph/ui";
import { createElementBounds } from "@solid-primitives/bounds";
import { createEventListener } from "@solid-primitives/event-listener";
import { createMousePosition } from "@solid-primitives/mouse";
import { createSignal, type JSX } from "solid-js";
import { produce, type StoreSetter } from "solid-js/store";

import { GraphContextMenu, GraphView, ProjectActions, ProjectState } from "..";
import { useProjectService } from "../EffectRuntime";
import type { TabState } from "../LayoutState";
import type { GraphState } from "../State";
import { createGraphContext, GraphContext } from "./Context";

export function makeGraphTabSchema(
	updateTab: (_: StoreSetter<TabState.GraphTab>) => void,
	setGraphCtxMenu: (
		state: { open: false } | { open: true; position: { x: number; y: number } },
	) => void,
	Component?: (props: { graph: { id: Graph.Id } }) => JSX.Element,
): TabLayout.Schema<
	TabState.GraphTab & {
		graph: GraphState;
	}
> {
	return {
		getMeta: (tab) => ({ title: tab.graph.name }),
		Component: (tab) => {
			const [ref, setRef] = createSignal<HTMLDivElement | null>(null);
			const bounds = createElementBounds(ref);
			const actions = useProjectService(ProjectActions);
			const { state } = useProjectService(ProjectState);
			const mouse = createMousePosition();

			const graphCtx = createGraphContext(
				() => bounds,
				() => tab().transform?.translate,
				ref,
			);

			createEventListener(window, "keydown", (e) => {
				if (e.code === "Backspace" || e.code === "Delete") {
					actions.DeleteGraphItems(tab().graphId, tab().selection);
				} else if (e.code === "Period") {
					if (e.metaKey || e.ctrlKey) {
						setGraphCtxMenu({
							open: true,
							position: { x: mouse.x, y: mouse.y },
						});
					}
				}
			});

			return (
				<GraphContext.Provider value={graphCtx}>
					<GraphView
						ref={setRef}
						nodes={tab().graph.nodes}
						connections={tab().graph.connections}
						selection={tab().selection}
						getSchema={(schemaRef) =>
							Option.fromNullable(
								state.packages[schemaRef.pkg]?.schemas.get(schemaRef.id),
							)
						}
						onContextMenu={(e) => {
							setGraphCtxMenu({
								open: true,
								position: {
									x: e.clientX,
									y: e.clientY,
								},
							});
						}}
						onContextMenuClose={() => {
							setGraphCtxMenu({ open: false });
						}}
						onItemsSelected={(selection) => {
							updateTab({ selection });
						}}
						onSelectionDrag={(items) => {
							actions.SetItemPositions(tab().graph.id, items);
						}}
						onSelectionDragEnd={(items) => {
							actions.SetItemPositions(tab().graph.id, items, false);
						}}
						onConnectIO={(from, to) => {
							actions.ConnectIO(tab().graph.id, from, to);
						}}
						onDisconnectIO={(io) => {
							actions.DisconnectIO(tab().graph.id, io);
						}}
						onDeleteSelection={() => {
							actions.DeleteGraphItems(tab().graph.id, [...tab().selection]);
						}}
						onTranslateChange={(translate) => {
							updateTab(
								produce((tab) => {
									tab.transform ??= {
										translate: { x: 0, y: 0 },
										zoom: 1,
									};
									tab.transform.translate = translate;
								}),
							);
						}}
					/>
					{Component && <Component graph={tab().graph} />}
					<GraphContextMenu
						packages={state.packages}
						onSchemaClick={(schemaRef, position) => {
							actions.CreateNode(tab().graph.id, schemaRef, position);
						}}
					/>
				</GraphContext.Provider>
			);
		},
	};
}
