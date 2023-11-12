import { createSignal, For, onCleanup, onMount } from "solid-js";
import { AiOutlineDelete } from "solid-icons/ai";

import { useCore } from "../contexts";
import { SidebarSection } from "./Sidebar";

export const PrintOutput = () => {
  const [items, setItems] = createSignal<{ value: string; timestamp: Date }[]>(
    []
  );

  const core = useCore();

  onMount(() => {
    const unsub = core.printSubscribe((value) =>
      setItems((i) => [{ value, timestamp: new Date() }, ...i])
    );

    onCleanup(unsub);
  });

  return (
    <SidebarSection
      title={
        <>
          Print Output
          <button
            onClick={(e) => {
              e.stopPropagation();
              setItems([]);
            }}
          >
            <AiOutlineDelete />
          </button>
        </>
      }
    >
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
    </SidebarSection>
  );
};
