import { createSignal, For, onCleanup } from "solid-js";
import { utils } from "@macrograph/packages";

export const PrintOutput = () => {
  const [items, setItems] = createSignal<{ value: string; timestamp: Date }[]>(
    []
  );

  const unsub = utils.PRINT_CHANNEL.subscribe((value) =>
    setItems((i) => [{ value, timestamp: new Date() }, ...i])
  );

  onCleanup(unsub);

  return (
    <div class="flex-1 flex flex-col overflow-y-hidden">
      <div class="flex flex-row bg-neutral-900 text-white px-2 font-medium shadow py-1">
        Print Output
      </div>
      <ul class="p-1 gap-y-2 flex flex-col flex-1 overflow-y-auto ">
        <For each={items()}>
          {(e) => (
            <li class="px-2 py-2 rounded-md bg-neutral-800">
              <p class="text-neutral-400 text-xs">
                {e.timestamp.toLocaleTimeString()}
              </p>
              <p class="text-neutral-100 text-sm break-words">{e.value}</p>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
};
