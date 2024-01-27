import { createResource } from "solid-js";

export type Ctx = ReturnType<typeof createCtx>;

export function createCtx() {
  const [access, accessActions] = createResource(async () => {
    try {
      return await navigator.requestMIDIAccess({ sysex: true });
    } catch {
      return null;
    }
  });

  function requestAccess() {
    accessActions.refetch();
  }

  return { access, requestAccess };
}
