import { DataOutput as DataOutputModel } from "@macrograph/core";
import { DataPin } from "./DataPin";

interface Props {
  output: DataOutputModel;
}

export const DataOutput = (props: Props) => {
  const output = props.output;

  return (
    <div class="flex flex-row items-center space-x-1.5 h-5">
      <span>{output.name}</span>
      <DataPin pin={output} />
    </div>
  );
};
