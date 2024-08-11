import { For, Show } from "solid-js";
import { useInterfaceContext } from "./context";

export function ActionHistory() {
  const ctx = useInterfaceContext();

  return (
    <ul class="absolute rounded top-4 right-4 bg-neutral-900 max-w-64 w-full p-2 flex flex-col">
      <For
        each={ctx.history}
        fallback={
          <span class="w-full text-center text-neutral-300 text-sm">
            No History
          </span>
        }
      >
        {(entry, i) => (
          <li class="flex flex-row items-center">
            <div class="w-4 h-4">
              <Show when={ctx.nextHistoryIndex() - 1 === i()}>
                <IconMaterialSymbolsArrowRightRounded class="w-6 h-6 -m-1" />
              </Show>
            </div>
            {entry.type}
          </li>
        )}
      </For>
    </ul>
  );
}
