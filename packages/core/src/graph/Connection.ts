import { computed } from "mobx";
import { nanoid } from "nanoid";
import { t } from "types";
import { BaseNode } from "../nodes";
import {
  BasePin,
  InputDataPin,
  InputExecPin,
  OutputDataPin,
  OutputExecPin,
} from "../pins";
export class Connection<O extends BasePin, I extends BasePin> {
  id = nanoid();

  output: O;
  outputNode: BaseNode;
  input: I;
  inputNode: BaseNode;

  constructor(args: { output: O; input: I }) {
    this.output = args.output;
    this.outputNode = args.output.node;
    this.input = args.input;
    this.inputNode = args.input.node;
  }

  @computed
  get path() {
    return {
      x1: this.output.position.x,
      y1: this.output.position.y,
      x2: this.input.position.x,
      y2: this.input.position.y,
    };
  }

  toJSON() {
    return {
      node: this.outputNode.id,
      pin: this.output.id,
    };
  }
}

export class DataConnection<T extends t.Type> extends Connection<
  OutputDataPin<T>,
  InputDataPin<T>
> {
  type: t.Type;

  constructor(args: {
    output: OutputDataPin<T>;
    input: InputDataPin<T>;
    type: t.Type;
  }) {
    super(args);
    this.type = args.type;
  }
}
export class ExecConnection extends Connection<OutputExecPin, InputExecPin> {}
