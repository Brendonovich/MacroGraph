import { ListType } from "~/bindings";
import { DataOutput, ExecOutput, DataInput, ExecInput, Pin } from "~/models";

export function pinsCanConnect(
  output: DataOutput | ExecOutput,
  input: DataInput | ExecInput
) {
  if (output instanceof DataOutput && input instanceof DataInput) {
    if (output.type.variant === input.type.variant) {
      if (output.type.variant === "primitive") {
        return output.type.value === input.type.value;
      } else {
        return output.type.value.value === (input.type.value as ListType).value;
      }
    }
  }
  if (output instanceof ExecOutput && input instanceof ExecInput) {
    return true;
  }
  return false;
}

export function pinIsOutput(pin: Pin): pin is DataOutput | ExecOutput {
  return pin instanceof DataOutput || pin instanceof ExecOutput;
}

export function pinIsInput(pin: Pin): pin is DataInput | ExecInput {
  return pin instanceof DataInput || pin instanceof ExecInput;
}
