import { For, Show } from "solid-js";

import { useService } from "../EffectRuntime";
import { PackageClients } from "./Clients";
import { ProjectState } from "../State";

export function PackagesSidebar(props: {
  packageId?: string;
  onChange?(packageId: string): void;
}) {
  const packageClients = useService(PackageClients);
  const { state } = useService(ProjectState);

  return (
    <>
      <input
        class="px-2 bg-gray-3 dark:bg-gray-2 h-8 text-sm focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
        placeholder="Search Packages"
        disabled
      />
      <ul>
        <For each={packageClients.listPackages()}>
          {(pkg) => (
            <Show when={state.packages[pkg]}>
              <li>
                <button
                  type="button"
                  class="w-full data-[selected='true']:bg-gray-2  hover:bg-gray-2 px-2 p-1 text-left bg-transparent focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
                  data-selected={props.packageId === pkg}
                  onClick={() => props.onChange?.(pkg)}
                >
                  {pkg}
                </button>
              </li>
            </Show>
          )}
        </For>
      </ul>
    </>
  );
}
