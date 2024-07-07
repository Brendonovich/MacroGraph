import type { Graph } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { Variables as VariablesRoot } from "../Variables";

export function Variables(props: { graph: Graph }) {
	return (
		<VariablesRoot
			titlePrefix="Graph"
			variables={props.graph.variables}
			onCreateVariable={() => {
				props.graph.createVariable({
					name: `Variable ${props.graph.variables.length + 1}`,
					value: "",
					type: t.string(),
				});
			}}
			onRemoveVariable={(id) => {
				props.graph.removeVariable(id);
			}}
			onSetVariableValue={(id, value) => {
				props.graph.setVariableValue(id, value);
			}}
		/>
	);
}
