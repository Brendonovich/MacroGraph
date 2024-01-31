import { typesCanConnect } from "@macrograph/typesystem";
import {
  DataOutput,
  ExecOutput,
  DataInput,
  ExecInput,
  ScopeOutput,
  ScopeInput,
  Pin,
} from "../models";

export function pinsCanConnect(
  output: DataOutput<any> | ExecOutput | ScopeOutput,
  input: DataInput<any> | ExecInput | ScopeInput
) {
  if (output instanceof DataOutput && input instanceof DataInput) {
    return typesCanConnect(output.type, input.type);
  } else if (output instanceof ExecOutput && input instanceof ExecInput) {
    if (input.connections.size < 1) return true;

    const outputAnc = output.node.ancestor();
    const inputAnc = input.node.ancestor();

    return outputAnc.eq(inputAnc);
  } else if (output instanceof ScopeOutput && input instanceof ScopeInput)
    return true;
  else return false;
}

export function pinIsOutput(
  pin: Pin
): pin is DataOutput<any> | ExecOutput | ScopeOutput {
  return (
    pin instanceof DataOutput ||
    pin instanceof ExecOutput ||
    pin instanceof ScopeOutput
  );
}

export function pinIsInput(
  pin: Pin
): pin is DataInput<any> | ExecInput | ScopeInput {
  return (
    pin instanceof DataInput ||
    pin instanceof ExecInput ||
    pin instanceof ScopeInput
  );
}
