import {
  DataOutput,
  ExecOutput,
  DataInput,
  ExecInput,
  ScopeOutput,
  ScopeInput,
  Pin,
} from "../models";
import { typesCanConnect } from "../types";

export function pinsCanConnect(
  output: DataOutput | ExecOutput | ScopeOutput,
  input: DataInput | ExecInput | ScopeInput
) {
  if (output instanceof DataOutput && input instanceof DataInput) {
    return typesCanConnect(output.type, input.type);
  } else if (output instanceof ExecOutput && input instanceof ExecInput)
    return true;
  else if (output instanceof ScopeOutput && input instanceof ScopeInput)
    return true;
  else return false;
}

export function pinIsOutput(
  pin: Pin
): pin is DataOutput | ExecOutput | ScopeOutput {
  return (
    pin instanceof DataOutput ||
    pin instanceof ExecOutput ||
    pin instanceof ScopeOutput
  );
}

export function pinIsInput(
  pin: Pin
): pin is DataInput | ExecInput | ScopeInput {
  return (
    pin instanceof DataInput ||
    pin instanceof ExecInput ||
    pin instanceof ScopeInput
  );
}
