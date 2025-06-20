import { Effect, Layer, ManagedRuntime } from "effect";
import { createContext, useContext } from "solid-js";

import { PackagesSettings } from "./Packages/PackagesSettings";
import { ProjectActions } from "./Project/Actions";
import { ProjectState } from "./Project/State";

export namespace ProjectRuntime {
  export type ProjectRuntime = ManagedRuntime.ManagedRuntime<
    | Layer.Layer.Success<typeof ProjectRuntime.layer>
    | Layer.Layer.Context<typeof ProjectRuntime.layer>,
    never
  >;

  export const layer = Layer.mergeAll(
    PackagesSettings.Default,
    Layer.provideMerge(ProjectActions.Default, ProjectState.Default),
  );
}

const ProjectRuntimeContext = createContext<ProjectRuntime.ProjectRuntime>();

export const ProjectRuntimeProvider = ProjectRuntimeContext.Provider;

export function useProjectRuntime() {
  const ctx = useContext(ProjectRuntimeContext);
  if (!ctx)
    throw new Error(
      "useProjectRuntime must be used within ProjectRuntimeProvider",
    );

  return ctx;
}

export function useProjectService<T>(
  service: Effect.Effect<
    T,
    never,
    ManagedRuntime.ManagedRuntime.Context<ProjectRuntime.ProjectRuntime>
  >,
) {
  const runtime = useProjectRuntime();

  return runtime.runSync(service);
}
