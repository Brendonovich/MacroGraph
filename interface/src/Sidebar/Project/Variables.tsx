import { Project } from "@macrograph/runtime";
import { Variables as VariablesRoot } from "../Variables";
import { t } from "@macrograph/typesystem";

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
