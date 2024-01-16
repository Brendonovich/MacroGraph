import { For, Show, createSignal, onMount } from "solid-js";
import { Graph } from "@macrograph/runtime";
import { Dialog } from "@kobalte/core";

import { useCore, useCoreContext } from "../../contexts";
import {
  deserializeClipboardItem,
  graphToClipboardItem,
  readFromClipboard,
  writeClipboardItemToClipboard,
} from "../../clipboard";
import clsx from "clsx";
import { Button } from "../../settings/ui";
import { SidebarSection } from "../../components/Sidebar";

// React component to show a list of projects
interface Props {
  currentGraph?: number;
  onGraphClicked(graph: Graph): void;
}

export function Graphs(props: Props) {
  const ctx = useCoreContext();

  return (
    <SidebarSection
      title="Graphs"
      right={
        <div class="flex flex-row items-center text-xl font-bold space-x-1">
          <button
            onClick={async (e) => {
              e.stopPropagation();
              const item = deserializeClipboardItem(await readFromClipboard());
              if (item.type !== "graph") return;

              item.graph.id = ctx.core.project.generateGraphId();
              const graph = Graph.deserialize(ctx.core.project, item.graph);
              ctx.core.project.graphs.set(graph.id, graph);
            }}
          >
            <IconGgImport />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              const graph = ctx.core.project.createGraph();
              props.onGraphClicked(graph);
            }}
          >
            <IconMaterialSymbolsAddRounded class="w-6 h-6" />
          </button>
        </div>
      }
    >
      <For each={[...ctx.core.project.graphs.values()]}>
        {(graph) => (
          <GraphItem
            graph={graph}
            onClick={() => props.onGraphClicked(graph)}
            isCurrentGraph={graph.id === props.currentGraph}
          />
        )}
      </For>
    </SidebarSection>
  );
}

interface GraphItemProps {
  graph: Graph;
  onClick: () => void;
  isCurrentGraph: boolean;
}

const buttonClasses = "hover:bg-white/20 p-1 rounded";

function GraphItem(props: GraphItemProps) {
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
            class="flex flex-row items-center px-2 py-1 w-full border-2 border-transparent justify-between group"
            onClick={props.onClick}
            onDblClick={() => setEditing(true)}
          >
            <span>{props.graph.name}</span>
            <div class="flex-row flex space-x-1 opacity-0 group-hover:opacity-100">
              <DeleteButton graph={props.graph} />
              <button
                class={buttonClasses}
                onClick={(e) => {
                  e.stopPropagation();
                  writeClipboardItemToClipboard(
                    graphToClipboardItem(props.graph)
                  );
                }}
              >
                <IconTablerCopy />
              </button>
            </div>
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
}

const DeleteButton = (props: { graph: Graph }) => {
  const core = useCore();

  function deleteGraph() {
    core.project.graphs.delete(props.graph.id);
    core.project.save();
  }

  return (
    <Dialog.Root>
      <Dialog.Trigger
        class={buttonClasses}
        onClick={(e) => {
          if (!e.shiftKey) return;

          // don't open the dialog if shift is pressed
          e.preventDefault();
          // don't want parent handlers to fire
          e.stopPropagation();

          deleteGraph();
        }}
        as="div"
      >
        <IconAntDesignDeleteOutlined />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay class="absolute inset-0 bg-black/40" />
        <Dialog.Content class="absolute inset-0 flex flex-col items-center py-10 overflow-hidden mt-96">
          <div class="flex flex-col bg-neutral-800 rounded-lg overflow-hidden">
            <div class="flex flex-row justify-between text-white p-4">
              <Dialog.Title>Confirm Deleting Graph?</Dialog.Title>
            </div>
            <div class="flex flex-row space-x-4 justify-center mb-4">
              <Button onClick={deleteGraph}>Delete</Button>
              <Dialog.CloseButton>
                <Button>Cancel</Button>
              </Dialog.CloseButton>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
