import { Layer, ManagedRuntime } from "effect";
import { createContext, useContext } from "solid-js";

import { PackagesSettings } from "./Packages/PackagesSettings";

export namespace AppRuntime {
  export const layer = Layer.mergeAll(PackagesSettings.Default);
}

const AppRuntimeContext =
  createContext<
    ManagedRuntime.ManagedRuntime<
      Layer.Layer.Success<typeof AppRuntime.layer>,
      never
    >
  >();

export const AppRuntimeProvider = AppRuntimeContext.Provider;

export function useAppRuntime() {
  const ctx = useContext(AppRuntimeContext);
  if (!ctx)
    throw new Error("useAppRuntime must be used within AppRuntimeProvider");

  return ctx;
}
