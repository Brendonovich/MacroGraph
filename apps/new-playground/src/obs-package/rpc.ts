import { Rpc, RpcGroup } from "@effect/rpc";
import { Schema } from "effect";

class ConnectionFailed extends Schema.TaggedError<ConnectionFailed>()(
  "FailedToConnect",
  {},
) {}

export const rpcGroup = RpcGroup.make().add(
  Rpc.make("AddConnection", {
    payload: Schema.Struct({
      address: Schema.String,
      password: Schema.optional(Schema.String),
    }),
    error: ConnectionFailed,
  }),
);
