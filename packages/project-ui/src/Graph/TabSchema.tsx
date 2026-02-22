import { Option } from "effect";
import type { Graph } from "@macrograph/project-domain";
import { IO } from "@macrograph/project-domain";
import type { TabLayout } from "@macrograph/ui";
import { createElementBounds } from "@solid-primitives/bounds";
import { createEventListener } from "@solid-primitives/event-listener";
import { createMousePosition } from "@solid-primitives/mouse";
import { type ComponentProps, createSignal, type JSX } from "solid-js";
import { produce, type StoreSetter } from "solid-js/store";

import { GraphContextMenu, GraphView, ProjectActions } from "..";
import { EditorState, type GraphState } from "../EditorState";
import { useProjectService } from "../EffectRuntime";
import type { TabState } from "../LayoutState";
import { createGraphContext, GraphContext } from "./Context";
import type { SourcePin } from "./GraphContextMenu";

export function makeGraphTabSchema(
	updateTab: (_: StoreSetter<TabState.GraphTab>) => void,
	setGraphCtxMenu: (
		state: { open: false } | { open: true; position: { x: number; y: number } },
		sourcePin?: SourcePin,
		onCancel?: () => void,
	) => void,
	graphProps?: Pick<ComponentProps<typeof GraphView>, "remoteSelections">,
	Component?: (props: {
		graph: { id: Graph.Id };
		tab: TabState.GraphTab;
	}) => JSX.Element,
): TabLayout.Schema<TabState.GraphTab & { graph: GraphState }> {
	return {
		getMeta: (tab) => ({ title: tab.graph.name }),
		Component: (tab) => {
			const [ref, setRef] = createSignal<HTMLDivElement | null>(null);
			const bounds = createElementBounds(ref);
			const actions = useProjectService(ProjectActions);
			const { state } = useProjectService(EditorState);
			const mouse = createMousePosition();

			const graphCtx = createGraphContext(
				() => bounds,
				() => tab().transform?.translate,
				() => tab().transform?.zoom ?? 1,
				ref,
				() => tab().graph.id,
				() => tab().selection,
			);

			createEventListener(window, "keydown", (e) => {
				if (e.target instanceof HTMLInputElement) return;

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
						onContextMenu={(e, sourcePin, onCancel) => {
							setGraphCtxMenu(
								{ open: true, position: { x: e.clientX, y: e.clientY } },
								sourcePin,
								onCancel,
							);
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
						onDefaultValueChange={(nodeId, inputId, value) => {
							actions.SetInputDefault(tab().graph.id, nodeId, inputId, value);
						}}
						onDeleteSelection={() => {
							actions.DeleteGraphItems(tab().graph.id, [...tab().selection]);
						}}
						onTranslateChange={(translate) => {
							updateTab(
								produce((tab) => {
									tab.transform ??= { translate: { x: 0, y: 0 }, zoom: 1 };
									tab.transform.translate = translate;
								}),
							);
						}}
						onScaleChange={(zoom) => {
							updateTab(
								produce((tab) => {
									tab.transform ??= { translate: { x: 0, y: 0 }, zoom: 1 };
									tab.transform.zoom = zoom;
								}),
							);
						}}
						{...graphProps}
					/>
					{Component && <Component graph={tab().graph} tab={tab()} />}
					<GraphContextMenu
						packages={state.packages}
						onSchemaClick={(schemaRef, position, sourcePin) => {
							console.log("onSchemaClick called with sourcePin:", sourcePin);
							console.log(
								"Creating node with:",
								tab().graph.id,
								schemaRef,
								position,
							);
							actions
								.CreateNode(tab().graph.id, schemaRef, position)
								.then((event) => {
									console.log("CreateNode resolved with event:", event);
									if (!sourcePin) return;

									const newNode = event.node;
									const io = event.io;

									// Parse the source pin ref to understand what we're connecting from
									console.log("CreateNode started, sourcePin:", sourcePin);
									console.log("New node IO:", io);
									console.log("New node:", newNode);
									const sourceRef = IO.parseRef(sourcePin.ref);
									const sourceIsOutput = sourceRef.type === "o";
									console.log("Source is output:", sourceIsOutput);

									// Find a compatible pin on the new node
									// Preference: match Exec with Exec, Data with Data
									// If dragging from output, look for inputs on new node
									// If dragging from input, look for outputs on new node
									let targetRef: IO.RefString | null = null;

									// Helper to check if two IO variants are compatible
									const ioVariantsCompatible = (
										a: IO.Exec | IO.Data,
										b: IO.Exec | IO.Data,
									): boolean => {
										if (a._tag === "Exec" && b._tag === "Exec") return true;
										if (a._tag === "Data" && b._tag === "Data") {
											return JSON.stringify(a.type) === JSON.stringify(b.type);
										}
										return false;
									};

									if (sourceIsOutput) {
										// Dragging from output → look for input on new node
										// Preference 1: matching variant type (Exec↔Exec or Data↔Data with same type)
										let matchingInput = io.inputs.find((input: IO.InputPort) =>
											ioVariantsCompatible(sourcePin.variant, input.variant),
										);
										// Preference 2: any input with the same type tag (Exec↔Exec, Data↔Data ignoring type)
										if (!matchingInput) {
											matchingInput = io.inputs.find(
												(input: IO.InputPort) =>
													input.variant._tag === sourcePin.variant._tag,
											);
										}
										// Preference 3: any input at all
										if (!matchingInput && io.inputs.length > 0) {
											matchingInput = io.inputs[0];
										}
										if (matchingInput) {
											targetRef = `${newNode.id}:i:${matchingInput.id}`;
										}
									} else {
										// Dragging from input → look for output on new node
										// Preference 1: matching variant type
										let matchingOutput = io.outputs.find(
											(output: IO.OutputPort) =>
												ioVariantsCompatible(output.variant, sourcePin.variant),
										);
										// Preference 2: any output with the same type tag
										if (!matchingOutput) {
											matchingOutput = io.outputs.find(
												(output: IO.OutputPort) =>
													output.variant._tag === sourcePin.variant._tag,
											);
										}
										// Preference 3: any output at all
										if (!matchingOutput && io.outputs.length > 0) {
											matchingOutput = io.outputs[0];
										}
										if (matchingOutput) {
											targetRef = `${newNode.id}:o:${matchingOutput.id}`;
										}
									}

									// Connect if we found a compatible pin
									if (targetRef) {
										console.log("Connecting:", sourcePin.ref, "→", targetRef);
										actions
											.ConnectIO(tab().graph.id, sourcePin.ref, targetRef)
											.then(() => console.log("Connected successfully"))
											.catch((err) => console.error("Connection failed:", err));
									} else {
										console.log("No target ref found - cannot connect");
									}
								})
								.catch((err) => {
									console.error("CreateNode failed:", err);
								});
						}}
						onClose={() => {
							// Note: onCancel is called by GraphContextMenu internally before this
							setGraphCtxMenu({ open: false });
						}}
					/>
				</GraphContext.Provider>
			);
		},
	};
}
