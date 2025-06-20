import { RpcClient } from "@effect/rpc";
import { Effect, Layer } from "effect";

import { Rpcs } from "../../rpc";
import { RpcsSerialization } from "../../shared";

export class ProjectRpc extends Effect.Service<ProjectRpc>()("ProjectRpc", {
  accessors: true,
  effect: Effect.gen(function* () {
    return { client: yield* RpcClient.make(Rpcs, { disableTracing: true }) };
  }),
  dependencies: [
    RpcClient.layerProtocolSocket.pipe(Layer.provide(RpcsSerialization)),
  ],
}) {}
