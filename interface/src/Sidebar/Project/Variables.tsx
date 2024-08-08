import type { Project } from "@macrograph/runtime";
import { useInterfaceContext } from "../../context";
import { Variables as VariablesRoot } from "../Variables";

export function Variables(props: { project: Project }) {
	const interfaceCtx = useInterfaceContext();

	return (
		<VariablesRoot
			titlePrefix="Project"
			variables={props.project.variables}
			onCreateVariable={() => {
				interfaceCtx.execute("createVariable", { location: "project" });
				interfaceCtx.save();
			}}
			onRemoveVariable={(id) => {
				interfaceCtx.execute("deleteVariable", {
					location: "project",
					variableId: id,
				});
				interfaceCtx.save();
			}}
			onSetVariableValue={(id, value) => {
				interfaceCtx.execute("setVariableValue", {
					location: "project",
					variableId: id,
					value,
				});
				interfaceCtx.save();
			}}
			onVariableNameChanged={(id, name) => {
				interfaceCtx.execute("setVariableName", {
					location: "project",
					variableId: id,
					name,
				});
				interfaceCtx.save();
			}}
		/>
	);
}
