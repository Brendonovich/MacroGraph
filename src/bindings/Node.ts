import type { Input } from "./Input";
import type { Output } from "./Output";
import type { Position } from "./Position";

export interface Node { id: number, schema: { name: string, package: string, }, position: Position, inputs: Array<Input>, outputs: Array<Output>, }