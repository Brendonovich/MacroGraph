import type { Project } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { Variables as VariablesRoot } from "../Variables";

export function Variables(props: { project: Project }) {
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
			}}
			onRemoveVariable={(id) => {
				props.project.removeVariable(id);
			}}
			onSetVariableValue={(id, value) => {
				props.project.setVariableValue(id, value);
			}}
		/>
	);
}
