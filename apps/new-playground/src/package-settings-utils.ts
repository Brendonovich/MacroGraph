import { RpcClient, RpcGroup } from "@effect/rpc";
import { Schema } from "effect";

export type SettingsProps<
  TRpcs extends RpcGroup.RpcGroup<any>,
  TState extends Schema.Schema<any>,
> = {
  rpc: RpcClient.RpcClient<RpcGroup.Rpcs<TRpcs>>;
  state: TState["Encoded"];
};
