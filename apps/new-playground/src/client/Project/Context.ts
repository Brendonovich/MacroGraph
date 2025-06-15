import { createContextProvider } from "@solid-primitives/context";
import { PackageMeta } from "../../shared";

const [ProjectContextProvider, _useProjectContext] = createContextProvider(
  (props: { packages: Record<string, PackageMeta> }) => props,
);

export { ProjectContextProvider };

export function useProjectContext() {
  const ctx = _useProjectContext();
  if (!ctx)
    throw new Error(
      "useProjectContext must be used within a ProjectContextProvider",
    );
  return ctx;
}
