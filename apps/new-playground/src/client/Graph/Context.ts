import { NullableBounds } from "@solid-primitives/bounds";
import { createContextProvider } from "@solid-primitives/context";

const [GraphContextProvider, _useGraphContext] = createContextProvider(
  (props: { bounds: Readonly<NullableBounds> }) => props,
);

export { GraphContextProvider };

export function useGraphContext() {
  const ctx = _useGraphContext();
  if (!ctx)
    throw new Error(
      "useGraphContext must be used within a GraphContextProvider",
    );
  return ctx;
}
