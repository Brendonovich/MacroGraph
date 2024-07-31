import type { Project } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { useInterfaceContext } from "../../context";
import { Variables as VariablesRoot } from "../Variables";

export function Variables(props: { project: Project }) {
	const interfaceCtx = useInterfaceContext();

	return (
		<VariablesRoot
			titlePrefix="Project"
			variables={props.project.variables}
			onCreateVariable={() => {
				props.project.createVariable({
					name: `Variable ${props.project.variables.length + 1}`,
					value: "",
					type: t.string(),
				});
				interfaceCtx.save();
			}}
			onRemoveVariable={(id) => {
				props.project.removeVariable(id);
				interfaceCtx.save();
			}}
			onSetVariableValue={(id, value) => {
				props.project.setVariableValue(id, value);
				interfaceCtx.save();
			}}
		/>
	);
}
