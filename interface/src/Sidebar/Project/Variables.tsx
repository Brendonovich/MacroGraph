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
			}}
			onRemoveVariable={(id) => {
				interfaceCtx.execute("deleteVariable", {
					location: "project",
					variableId: id,
				});
			}}
			onSetVariableValue={(id, value) => {
				interfaceCtx.execute("setVariableValue", {
					location: "project",
					variableId: id,
					value,
				});
			}}
			onSetVariableType={(id, type) => {
				interfaceCtx.execute("setVariableType", {
					location: "project",
					variableId: id,
					type,
				});
			}}
			onVariableNameChanged={(id, name) => {
				interfaceCtx.execute("setVariableName", {
					location: "project",
					variableId: id,
					name,
				});
			}}
		/>
	);
}
