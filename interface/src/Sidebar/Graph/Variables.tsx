import { Graph } from "@macrograph/runtime";
import { Variables as VariablesRoot } from "../Variables";
import { t } from "@macrograph/typesystem";

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
