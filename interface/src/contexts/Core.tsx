import { Accessor, createContext, ParentProps, useContext } from "solid-js";
import { Core } from "@macrograph/core";

type Context = { core: Core; rootRef: Accessor<HTMLDivElement | undefined> };

const CoreContext = createContext<Context>(null as any);

export const useCore = () => useCoreContext().core;

export const useCoreContext = () => {
  const ctx = useContext(CoreContext);

  if (!ctx) throw new Error("CoreContext not found!");

  return ctx;
};

export const CoreProvider = (props: ParentProps<Context>) => {
  return (
    <CoreContext.Provider value={{ core: props.core, rootRef: props.rootRef }}>
      {props.children}
    </CoreContext.Provider>
  );
};
