import type { Effect, ManagedRuntime } from "effect";
import { createContext, useContext } from "solid-js";

import type { PackageClients } from "./Packages/Clients";
import type { ProjectState } from "./State";

export type EffectRuntime = ManagedRuntime.ManagedRuntime<
  PackageClients | ProjectState,
  never
>;

export const ProjectEffectRuntimeContext = createContext<EffectRuntime>();

export function useEffectRuntime() {
  const ctx = useContext(ProjectEffectRuntimeContext);
  if (!ctx)
    throw new Error(
      "useEffectRuntime must be used within EffectRuntimeContext.Provider",
    );

  return ctx;
}

export function useService<T>(
  service: Effect.Effect<
    T,
    never,
    ManagedRuntime.ManagedRuntime.Context<EffectRuntime>
  >,
) {
  const runtime = useEffectRuntime();

  return runtime.runSync(service);
}
