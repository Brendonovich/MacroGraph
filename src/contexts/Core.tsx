import { createContext, ParentProps, useContext } from "solid-js";
import { Core } from "~/models";

const CoreContext = createContext<Core>(null as any);

export const useCore = () => {
  const ctx = useContext(CoreContext);

  if (!ctx) throw new Error("CoreContext not found!");

  return ctx;
};

export const CoreProvider = (props: ParentProps<{ core: Core }>) => {
  return (
    <CoreContext.Provider value={props.core}>
      {props.children}
    </CoreContext.Provider>
  );
};
