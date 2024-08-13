import type { Graph } from "@macrograph/runtime";

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
		/>
	);
}
