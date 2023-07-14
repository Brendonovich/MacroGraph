// react component

import clsx from "clsx";
import { createSignal, onMount, Show } from "solid-js";

import { core, Graph } from "@macrograph/core";
import { TbCopy } from "solid-icons/tb";
import { AiOutlineDelete } from "solid-icons/ai";
import { Dialog } from "@kobalte/core";
import { Button } from "~/settings/ui";

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
            class="flex flex-row items-center px-2 py-1 w-full border-2 border-transparent justify-between"
            onClick={props.onClick}
            onDblClick={() => setEditing(true)}
          >
            <span>{props.graph.name}</span>
            <div class="flex-row flex space-x-3">
              <DeleteButton graph={props.graph} />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    btoa(JSON.stringify(props.graph.serialize()))
                  );
                }}
              >
                <TbCopy />
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
};

const DeleteButton = (props: { graph: Graph }) => {
  return (
    <Dialog.Root>
      <Dialog.Trigger as="div">
        <AiOutlineDelete />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay class="absolute inset-0 bg-black/40" />
        <Dialog.Content class="absolute inset-0 flex flex-col items-center py-10 overflow-hidden mt-96">
          <div class="flex flex-col bg-neutral-800 rounded-lg overflow-hidden">
            <div class="flex flex-row justify-between text-white p-4">
              <Dialog.Title>Confirm Deleting Graph?</Dialog.Title>
            </div>
            <div class="flex flex-row space-x-4 justify-center mb-4">
              <Button
                onclick={async () => {
                  core.project.graphs.delete(props.graph.id);
                  core.project.save();
                }}
              >
                Delete
              </Button>
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
