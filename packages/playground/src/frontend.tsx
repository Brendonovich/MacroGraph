import {
  PackagesSettings,
  ProjectActions,
  ProjectState,
} from "@macrograph/project-frontend";
import { Effect, Layer } from "effect";
import { PlaygroundRpc } from "./rpc";

export const loadPackages = Effect.gen(function* () {
  const packageSettings = yield* Effect.promise(
    () => import("@macrograph/base-packages/Settings"),
  );

  yield* Effect.all(
    Object.entries(packageSettings.default).map(([id, getPkg]) =>
      Effect.gen(function* () {
        const pkg = yield* Effect.promise(getPkg);

        yield* PackagesSettings.addPackage(id, pkg);
      }),
    ),
    { concurrency: 3 },
  );
});

export const FrontendLayers = Layer.mergeAll(
  PackagesSettings.Default,
  PlaygroundRpc.Default,
  ProjectActions.Default,
  ProjectState.Default,
);
