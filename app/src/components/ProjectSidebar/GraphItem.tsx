// react component

import clsx from "clsx";
import { createSignal, onMount, Show } from "solid-js";

import { Graph } from "@macrograph/core";

interface Props {
  graph: Graph;
  onClick: () => void;
  isCurrentGraph: boolean;
}

export const GraphItem = (props: Props) => {
  const [editing, setEditing] = createSignal(false);

  return (
    <div
      class={clsx(
        "cursor-pointer text-white",
        props.isCurrentGraph ? "bg-neutral-700" : "hover:bg-neutral-500"
      )}
    >
      <Show
        when={editing()}
        fallback={
          <div
            class="flex flex-row items-center px-2 py-1 w-full border-2 border-transparent"
            onClick={props.onClick}
            onDblClick={() => setEditing(true)}
          >
            {props.graph.name}
          </div>
        }
      >
        {(_) => {
          const [name, setName] = createSignal(props.graph.name);

          let ref: HTMLInputElement | undefined;

          onMount(() => ref?.focus());

          return (
            <input
              ref={ref}
              class={clsx(
                "px-2 py-1 w-full outline-none box-border border-2 border-sky-600",
                props.isCurrentGraph ? "bg-neutral-700" : "hover:bg-neutral-500"
              )}
              value={name()}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                props.graph.rename(name());
                setEditing(false);
              }}
            />
          );
        }}
      </Show>
    </div>
  );
};
