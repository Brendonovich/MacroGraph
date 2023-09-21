import { CommentBox } from "@macrograph/core";
import clsx from "clsx";
import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";

import { useUIStore } from "../../UIStore";

interface Props {
  box: CommentBox;
}

export default (props: Props) => {
  const box = () => props.box;
  const graph = () => props.box.graph;
  const position = () => props.box.position;
  const size = () => props.box.size;

  const UI = useUIStore();

  const [editing, setEditing] = createSignal(false);

  return (
    <div
      class={clsx(
        "bg-white/30 rounded border-black/75 border-2 absolute top-0 left-0",
        UI.state.selectedItem === props.box && "ring-2 ring-yellow-500"
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
                    UI.setSelectedItem(props.box);

                    const nodes = box().getNodes(
                      graph().nodes.values(),
                      (node) => UI.state.nodeBounds.get(node) ?? null
                    );

                    const handleMouseMove = (e: MouseEvent) => {
                      const scale = UI.state.scale;

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
                    };

                    window.addEventListener("mousemove", handleMouseMove);
                    const listener = () => {
                      graph().project.save();

                      window.removeEventListener("mouseup", listener);
                      window.removeEventListener("mousemove", handleMouseMove);
                    };
                    window.addEventListener("mouseup", listener);

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
                    graph().deleteItem(box());
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

            createEffect(() => setEditing(UI.state.selectedItem === props.box));

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

          const handleMouseMove = (e: MouseEvent) => {
            const scale = UI.state.scale;

            props.box.size = {
              x: box().size.x + e.movementX / scale,
              y: box().size.y + e.movementY / scale,
            };
          };

          switch (e.button) {
            case 0: {
              UI.setSelectedItem(props.box);

              window.addEventListener("mousemove", handleMouseMove);
              const listener = () => {
                window.removeEventListener("mouseup", listener);
                window.removeEventListener("mousemove", handleMouseMove);

                graph().project.save();
              };
              window.addEventListener("mouseup", listener);

              break;
            }
            default:
              break;
          }
        }}
      />
    </div>
  );
};
