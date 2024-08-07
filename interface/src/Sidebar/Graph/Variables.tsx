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
        interfaceCtx.save();
      }}
      onRemoveVariable={(id) => {
        interfaceCtx.execute("deleteVariable", {
          location: "graph",
          graphId: props.graph.id,
          variableId: id,
        });
        interfaceCtx.save();
      }}
      onSetVariableValue={(id, value) => {
        interfaceCtx.execute("setVariableValue", {
          location: "graph",
          graphId: props.graph.id,
          variableId: id,
          value,
        });
        interfaceCtx.save();
      }}
      onVariableNameChanged={(id, name) => {
        interfaceCtx.execute("setVariableName", {
          location: "graph",
          graphId: props.graph.id,
          variableId: id,
          name,
        });
        interfaceCtx.save();
      }}
    />
  );
}
