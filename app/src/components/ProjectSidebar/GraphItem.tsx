// react component

import clsx from "clsx";
import { createSignal, Show } from "solid-js";

import { Graph } from "@macrograph/core";

interface Props {
  graph: Graph;
  onClick: () => void;
  isCurrentGraph: boolean;
}

export const GraphItem = (props: Props) => {
  const [editing, setEditing] = createSignal(props.isCurrentGraph);

  return (
    <div
      class={clsx(
        "cursor-pointer text-white",
        props.isCurrentGraph ? "bg-neutral-700" : "hover:bg-neutral-500"
      )}
      ondblclick={() =>
        console.log(JSON.stringify(props.graph.serialize(), null, 4))
      }
    >
      <Show
        when={editing()}
        fallback={
          <div
            class="flex flex-row items-center px-2 py-1 w-full border-2 border-transparent"
            onclick={props.onClick}
            // ondblclick={() => setEditing(true)}
          >
            {props.graph.name}
          </div>
        }
      >
        <input
          class={clsx(
            "px-2 py-1 w-full outline-none box-border border-2 border-sky-600",
            props.isCurrentGraph ? "bg-neutral-700" : "hover:bg-neutral-500"
          )}
          autofocus
          value={props.graph.name}
          onChange={(e) => props.graph.rename(e.target.value)}
          onBlur={() => setEditing(false)}
        />
      </Show>
    </div>
  );
};
