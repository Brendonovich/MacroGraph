import { createResource } from "solid-js";

export type Ctx = ReturnType<typeof createCtx>;

export function createCtx() {
  const [access, accessActions] = createResource(() =>
    navigator.requestMIDIAccess()
  );

  function requestAccess() {
    accessActions.refetch();
  }

  return { access, requestAccess };
}
