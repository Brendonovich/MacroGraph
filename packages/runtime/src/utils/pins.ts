import { type Option, Some } from "@macrograph/option";
import { getOptionDepth, t, typesCanConnect } from "@macrograph/typesystem";
import {
  DataInput,
  DataOutput,
  ExecInput,
  ExecOutput,
  type InputPin,
  type OutputPin,
  type Pin,
  ScopeInput,
  ScopeOutput,
} from "../models/IO";

export function pinsCanConnect(output: OutputPin, input: InputPin) {
  if (output instanceof DataOutput && input instanceof DataInput) {
    const canConnect = typesCanConnect(output.type, input.type);

    if (!canConnect) return pinsCanConnectWithImplicitConversion(output, input);

    return canConnect;
  }
  if (output instanceof ExecOutput && input instanceof ExecInput) {
    if (input.connections.size < 1) return true;

    const outputAnc = output.node.ancestor();
    const inputAnc = input.node.ancestor();

    return outputAnc.eq(inputAnc);
  }
  if (output instanceof ScopeOutput && input instanceof ScopeInput) return true;
  return false;
}

export const implicitConversions = {
  toSome: {
    check: (output: t.Any, input: t.Any) => {
      return (
        input instanceof t.Option &&
        getOptionDepth(output) + 1 === getOptionDepth(input) &&
        typesCanConnect(input.inner, output)
      );
    },
    apply: (value: any) => Some(value),
  },
  toInt: {
    check: (output: t.Any, input: t.Any) =>
      output instanceof t.Float && input instanceof t.Int,
    apply: (value: any) => Math.floor(value),
  },
  toFloat: {
    check: (output: t.Any, input: t.Any) =>
      output instanceof t.Int && input instanceof t.Float,
    apply: (value: any) => value,
  },
  toString: {
    check: (output: t.Any, input: t.Any) =>
      output instanceof t.Primitive && input instanceof t.String,
    apply: (value: any) => value.toString(),
  },
};

function pinsCanConnectWithImplicitConversion(
  output: DataOutput<any>,
  input: DataInput<any>,
) {
  for (const conversion of Object.values(implicitConversions)) {
    if (conversion.check(output.type, input.type)) {
      return true;
    }
  }
}

export function pinIsOutput(pin: Pin): pin is OutputPin {
  return (
    pin instanceof DataOutput ||
    pin instanceof ExecOutput ||
    pin instanceof ScopeOutput
  );
}

export function pinIsInput(pin: Pin): pin is InputPin {
  return (
    pin instanceof DataInput ||
    pin instanceof ExecInput ||
    pin instanceof ScopeInput
  );
}

export function pinConnections(pin: Pin) {
  const connections: Array<{ nodeId: number; id: string }> = [];

  if (pin instanceof ExecOutput || pin instanceof ScopeOutput)
    (pin.connection() as Option<ExecInput | ScopeInput>).peek((connInput) => {
      connections.push({ nodeId: connInput.node.id, id: connInput.id });
    });
  else if (pin instanceof DataOutput) {
    for (const connInput of pin.connections()) {
      connections.push({ nodeId: connInput.node.id, id: connInput.id });
    }
  } else if (pin instanceof DataInput || pin instanceof ScopeInput)
    (pin.connection as Option<DataOutput<any> | ScopeOutput>).peek(
      (connOutput) => {
        connections.push({ nodeId: connOutput.node.id, id: connOutput.id });
      },
    );
  else if (pin instanceof ExecInput)
    for (const connection of pin.connections)
      connections.push({ nodeId: connection.node.id, id: connection.id });

  return connections;
}
