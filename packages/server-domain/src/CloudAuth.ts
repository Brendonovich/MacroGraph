import { Rpc, RpcGroup } from "@effect/rpc";
import { Schema } from "effect";

export const CloudLoginEvent = Schema.Union(
  Schema.Struct({
    type: Schema.Literal("started"),
    verificationUrlComplete: Schema.String,
  }),
  Schema.Struct({
    type: Schema.Literal("finished"),
  }),
);

export class CloudApiError extends Schema.TaggedError<CloudApiError>(
  "CloudApiError",
)("CloudApiError", {}) {}

export const Rpcs = RpcGroup.make(
  Rpc.make("CloudLogin", {
    stream: true,
    success: CloudLoginEvent,
    error: CloudApiError,
  }),
);
