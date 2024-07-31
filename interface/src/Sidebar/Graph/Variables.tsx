import type { Graph } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";

import { useInterfaceContext } from "../../context";
import { Variables as VariablesRoot } from "../Variables";

export function Variables(props: { graph: Graph }) {
	const interfaceCtx = useInterfaceContext();

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
				interfaceCtx.save();
			}}
			onRemoveVariable={(id) => {
				props.graph.removeVariable(id);
				interfaceCtx.save();
			}}
			onSetVariableValue={(id, value) => {
				props.graph.setVariableValue(id, value);
				interfaceCtx.save();
			}}
		/>
	);
}
