import { Show } from "solid-js";
import { EffectButton } from "@macrograph/package-sdk/ui";

import { useProjectService } from "../../AppRuntime";
import { ProjectActions } from "../../Project/Actions";
import { ProjectState } from "../../Project/State";

export default function Account() {
  const actions = useProjectService(ProjectActions);
  const { state } = useProjectService(ProjectState);

  return (
    <>
      <span class="text-xl font-bold mb-1">Account</span>
      <p class="text-gray-11 mb-3">
        The MacroGraph account this instance is connected to.
      </p>
      <Show
        when={state.auth}
        fallback={
          <EffectButton onClick={() => actions.CloudLogin}>Login</EffectButton>
        }
      >
        {(auth) => (
          <div class="flex flex-row items-center w-full bg-gray-1 rounded-l">
            <span class="px-2 flex-1">{auth().email}</span>
            <EffectButton>Logout</EffectButton>
          </div>
        )}
      </Show>
    </>
  );
}
