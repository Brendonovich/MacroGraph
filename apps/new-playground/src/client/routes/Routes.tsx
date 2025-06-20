import { Navigate, RouteDefinition } from "@solidjs/router";
import { lazy, Show } from "solid-js";

import { useProjectService } from "../AppRuntime";
import { ProjectState } from "../Project/State";
import { Data, Effect, Either, Option, pipe, Stream } from "effect";

const effects = [
  Effect.succeed(1),
  Effect.fail("fail"),
  Effect.succeed(2),
  Effect.succeed(false),
];

class NoSuccesses extends Data.TaggedError("NoSuccesses")<{}> {}

const optimisticRace = (effects: Array<Effect.Effect<any, any, never>>) =>
  Effect.gen(function* () {
    const successStream = Stream.mergeAll(
      effects.map((v) => v.pipe(Effect.either, Stream.fromEffect)),
      { concurrency: "unbounded" },
    ).pipe(
      Stream.filterMap(
        Either.match({
          onLeft: Option.some,
          onRight: Option.none,
        }),
      ),
    );

    return yield* Stream.runHead(Stream.take(successStream, 1)).pipe(
      Effect.flatMap(
        Option.match({
          onSome: (v) =>
            pipe(
              Stream.fromIterable([v]),
              Stream.concat(successStream),
              Effect.succeed,
            ),
          onNone: () => new NoSuccesses(),
        }),
      ),
    );
  });

export const routes: RouteDefinition[] = [
  {
    path: "/",
    component: lazy(() => import("./index")),
  },
  {
    path: "/packages",
    children: [
      {
        path: "/",
        component: () => {
          const { state } = useProjectService(ProjectState);

          return (
            <Show when={Object.keys(state.packages)[0]}>
              {(href) => <Navigate href={href()} />}
            </Show>
          );
        },
      },
      {
        path: "/:package",
        component: lazy(() => import("./packages.[package]")),
      },
    ],
    component: lazy(() => import("./packages")),
  },
];
