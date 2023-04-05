import type { Graph } from "./Graph";
import type { Input } from "./Input";
import type { Output } from "./Output";
import type { Package } from "./Package";

export type Response = { type: "CreateNode", data: { id: number, inputs: Array<Input>, outputs: Array<Output>, } } | { type: "SetDefaultValue" } | { type: "SetNodePosition" } | { type: "ConnectIO" } | { type: "DisconnectIO" } | { type: "DeleteNode" } | { type: "CreateGraph", data: { id: number, name: string, } } | { type: "RenameGraph" } | { type: "GetPackages", data: { packages: Array<Package>, } } | { type: "GetProject", data: { graphs: Array<Graph>, } } | { type: "Reset" };