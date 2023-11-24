import { CommentBox as CommentBoxModel } from "@macrograph/core";
import clsx from "clsx";
import {
  createEffect,
  createRoot,
  createSignal,
  onCleanup,
  onMount,
  Show,
} from "solid-js";

import { useUIStore } from "../../UIStore";
import { useGraphContext } from "./Graph";
import { createEventListenerMap } from "@solid-primitives/event-listener";

interface Props {
  box: CommentBoxModel;
  onSelected(): void;
}

export function CommentBox(props: Props) {
  const graph = useGraphContext();

  const box = () => props.box;
  const position = () => props.box.position;
  const size = () => props.box.size;

  const UI = useUIStore();

  const [editing, setEditing] = createSignal(false);

  const isSelected = () => {
    const selected = graph.state.selectedItemId;
    return selected?.type === "commentBox" && selected.id === props.box.id;
  };

  return (
    <div
      class={clsx(
        "bg-white/30 rounded border-black/75 border-2 absolute top-0 left-0",
        isSelected() && "ring-2 ring-yellow-500"
      )}
      style={{
        transform: `translate(${position().x}px, ${position().y}px)`,
        width: `${size().x}px`,
        height: `${size().y}px`,
      }}
    >
      <div class="truncate p-2 bg-white/50 text-black font-medium cursor-pointer outline-none">
        <Show
          when={editing()}
          fallback={
            <div
              class="pl-1 outline-none"
              onMouseDown={(e) => {
                e.currentTarget.focus();
                e.stopPropagation();

                if (editing()) return;

                switch (e.button) {
                  case 0: {
                    props.onSelected();

                    const nodes = box().getNodes(
                      graph.model().nodes.values(),
                      (node) => graph.nodeSizes.get(node)
                    );

                    createRoot((dispose) => {
                      onCleanup(() => graph.model().project.save());

                      createEventListenerMap(window, {
                        mouseup: dispose,
                        mousemove: (e) => {
                          const scale = graph.state.scale;

                          box().position = {
                            x: box().position.x + e.movementX / scale,
                            y: box().position.y + e.movementY / scale,
                          };

                          nodes.forEach((node) => {
                            node.state.position = {
                              x: node.state.position.x + e.movementX / scale,
                              y: node.state.position.y + e.movementY / scale,
                            };
                          });
                        },
                      });
                    });

                    break;
                  }
                  default:
                    break;
                }
              }}
              tabIndex={-1}
              onKeyDown={(e) => {
                if (editing()) return;

                switch (e.key) {
                  case "Backspace":
                  case "Delete": {
                    graph.model().deleteItem(box());
                    break;
                  }
                }
              }}
              onDblClick={() => setEditing(true)}
            >
              {props.box.text}
            </div>
          }
        >
          {(_) => {
            const [value, setValue] = createSignal(props.box.text);

            let ref: HTMLInputElement | undefined;

            onMount(() => ref?.focus());

            createEffect(() => setEditing(isSelected()));

            onCleanup(() => {
              if (value() !== "") props.box.text = value();
            });

            return (
              <input
                ref={ref}
                class="p-0 pl-1 border-0 w-full"
                type="text"
                value={value()}
                onInput={(e) => setValue(e.target.value)}
                onContextMenu={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
            );
          }}
        </Show>
      </div>
      <div
        class="bg-transparent w-2 h-2 cursor-nwse-resize -right-1 -bottom-1 fixed"
        onMouseDown={(e) => {
          e.currentTarget.focus();
          e.stopPropagation();

          setEditing(false);

          switch (e.button) {
            case 0: {
              props.onSelected();

              createRoot((dispose) => {
                onCleanup(() => graph.model().project.save());

                createEventListenerMap(window, {
                  mouseup: dispose,
                  mousemove: (e) => {
                    const scale = graph.state.scale;

                    props.box.size = {
                      x: box().size.x + e.movementX / scale,
                      y: box().size.y + e.movementY / scale,
                    };
                  },
                });
              });

              break;
            }
            default:
              break;
          }
        }}
      />
    </div>
  );
}
