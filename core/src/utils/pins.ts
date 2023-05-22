import { DataOutput, ExecOutput, DataInput, ExecInput, Pin } from "../models";
import { typesCanConnect } from "../types";

export function pinsCanConnect(
  output: DataOutput | ExecOutput,
  input: DataInput | ExecInput
) {
  if (output instanceof DataOutput && input instanceof DataInput) {
    return typesCanConnect(output.type, input.type);
  } else if (output instanceof ExecOutput && input instanceof ExecInput)
    return true;
  else return false;
}

export function pinIsOutput(pin: Pin): pin is DataOutput | ExecOutput {
  return pin instanceof DataOutput || pin instanceof ExecOutput;
}

export function pinIsInput(pin: Pin): pin is DataInput | ExecInput {
  return pin instanceof DataInput || pin instanceof ExecInput;
}
