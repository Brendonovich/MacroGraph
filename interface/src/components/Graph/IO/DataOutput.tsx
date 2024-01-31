import { DataOutput as DataOutputModel } from "@macrograph/runtime";
import { Show } from "solid-js";
import { DataPin } from "./DataPin";

interface Props {
  output: DataOutputModel<any>;
}

export const DataOutput = (props: Props) => {
  return (
    <div class="flex flex-row items-center space-x-1.5 h-5">
      <Show when={props.output.name}>{(name) => <span>{name()}</span>}</Show>
      <DataPin pin={props.output} />
    </div>
  );
};
