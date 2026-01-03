import type { Graph } from "@macrograph/runtime";
import {
	deserializeNode,
	deserializeVariable,
	serde,
	serializeNode,
	serializeVariable,
} from "@macrograph/runtime-serde";
import { batch } from "solid-js";
import * as v from "valibot";

import { ContextMenuItem } from "../../components/Graph/ContextMenu";
import { useInterfaceContext } from "../../context";
import { Variables as VariablesRoot } from "../Variables";

export function Variables(props: { graph: Graph }) {
	const interfaceCtx = useInterfaceContext();

	return (
		<VariablesRoot
			titlePrefix="Graph"
			variables={props.graph.variables}
			onCreateVariable={() => {
				interfaceCtx.execute("createVariable", {
					location: "graph",
					graphId: props.graph.id,
				});
			}}
			onRemoveVariable={(id) => {
				interfaceCtx.execute("deleteVariable", {
					location: "graph",
					graphId: props.graph.id,
					variableId: id,
				});
			}}
			onSetVariableValue={(id, value) => {
				interfaceCtx.execute("setVariableValue", {
					location: "graph",
					graphId: props.graph.id,
					variableId: id,
					value,
				});
			}}
			onSetVariableType={(id, type) => {
				interfaceCtx.execute("setVariableType", {
					location: "graph",
					graphId: props.graph.id,
					variableId: id,
					type,
				});
			}}
			onVariableNameChanged={(id, name) => {
				interfaceCtx.execute("setVariableName", {
					location: "graph",
					graphId: props.graph.id,
					variableId: id,
					name,
				});
			}}
			contextMenu={(id) => (
				<>
					<ContextMenuItem
						onSelect={() => {
							const graph = props.graph;
							const project = graph.project;
							const variable = graph.variables.find((v) => v.id === id);
							if (!variable) return;

							const serializedVariable = serializeVariable(variable);
							serializedVariable.id = project.generateId();

							batch(() => {
								project.variables.push(
									deserializeVariable(serializedVariable, project),
								);
								for (const node of graph.nodes.values()) {
									if (
										node.schema.package.name === "Variables" &&
										[
											"Get Graph Variable",
											"Set Graph Variable",
											"Graph Variable Changed",
										].includes(node.schema.name) &&
										node.schema.properties?.variable &&
										variable.id === node.state.properties.variable
									) {
										console.log(variable.id);
										console.log(node.state.properties.variable);
										const serialized = serializeNode(node);
										serialized.properties!.variable = serializedVariable.id;
										serialized.schema.id = serialized.schema.id.replace(
											"Graph",
											"Project",
										);
										serialized.name = serialized.name.replace(
											"Graph",
											"Project",
										);

										const newNode = deserializeNode(
											graph,
											v.parse(serde.Node, serialized),
										);
										if (newNode) {
											graph.nodes.set(serialized.id, newNode);
											node.dispose();
										}
									}
								}

								interfaceCtx.execute(
									"deleteVariable",
									{ location: "graph", graphId: graph.id, variableId: id },
									{ ephemeral: true },
								);

								interfaceCtx.save();
							});
						}}
					>
						<IconOcticonProjectSymlink16 class="size-3" /> Move to project
					</ContextMenuItem>
				</>
			)}
		/>
	);
}
