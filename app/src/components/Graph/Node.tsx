import clsx from "clsx";
import {
  For,
  Match,
  Switch,
  createSignal,
  onCleanup,
  Show,
  onMount,
} from "solid-js";
import "./Node.css";
import { NodeProvider } from "~/contexts";
import {
  Node as NodeModel,
  DataInput as DataInputModel,
  DataOutput as DataOutputModel,
  ExecInput as ExecInputModel,
  ExecOutput as ExecOutputModel,
  NodeSchemaVariant,
  NODE_EMIT,
} from "@macrograph/core";
import { useUIStore } from "~/UIStore";
import { useGraph } from "./Graph";
import { DataInput, DataOutput, ExecInput, ExecOutput } from "./IO";

interface Props {
  node: NodeModel;
}

const SchemaVariantColours: Record<NodeSchemaVariant, string> = {
  Exec: "bg-mg-exec",
  Base: "bg-mg-base",
  Event: "bg-mg-event",
  Pure: "bg-mg-pure",
};

export const Node = (props: Props) => {
  const node = props.node;
  const graph = useGraph();
  const UI = useUIStore();
  let Toggle = 0;

  const ACTIVE = NODE_EMIT.subscribe(node, (data) => {
    if (node.id === data.id && data.schema === node.schema) {
      Toggle++;
      Toggle == 1 && updateActive(1);
      setTimeout(() => {
        Toggle--;
        Toggle == 0 && updateActive(0);
      }, 200);
    }
  });

  const [active, updateActive] = createSignal(0);

  onCleanup(ACTIVE);

  const handleMouseMove = (e: MouseEvent) => {
    const scale = UI.state.scale;

    node.setPosition({
      x: node.position.x + e.movementX / scale,
      y: node.position.y + e.movementY / scale,
    });
  };

  const [editingName, setEditingName] = createSignal(false);

  let ref: HTMLDivElement | undefined;

  onMount(() => {
    if (!ref) return;

    const obs = new ResizeObserver((resize) => {
      const contentRect = resize[resize.length - 1]?.contentRect;

      if (!contentRect) return;

      UI.state.nodeBounds.set(node, {
        width: contentRect.width,
        height: contentRect.height,
      });
    });

    obs.observe(ref);

    onCleanup(() => obs.disconnect());
  });

  return (
    <NodeProvider node={node}>
      <div
        ref={ref}
        class={clsx(
          "absolute top-0 left-0 text-[12px] overflow-hidden rounded-lg flex flex-col bg-black/75 border-black/75 border-2",
          node.selected && "ring-2 ring-yellow-500"
        )}
        style={{
          transform: `translate(${node.position.x}px, ${node.position.y}px)`,
        }}
      >
        <div
          class={clsx(
            "h-6 duration-100 text-md font-medium",
            active() === 1 ? "active-fade-in" : "fade-Duration",
            SchemaVariantColours[
              "variant" in node.schema ? node.schema.variant : "Event"
            ]
          )}
        >
          <Show
            when={editingName()}
            fallback={
              <div
                class="px-2 pt-1 cursor-pointer outline-none"
                tabIndex={-1}
                onDblClick={() => setEditingName(true)}
                onKeyDown={(e) => {
                  switch (e.key) {
                    case "Backspace":
                    case "Delete": {
                      graph().deleteItem(node);
                      break;
                    }
                  }
                }}
                onMouseDown={(e) => {
                  e.currentTarget.focus();
                  e.stopPropagation();
                  e.preventDefault();
                  switch (e.button) {
                    case 0: {
                      UI.setSelectedItem(node);

                      window.addEventListener("mousemove", handleMouseMove);
                      const listener = () => {
                        window.removeEventListener("mouseup", listener);
                        window.removeEventListener(
                          "mousemove",
                          handleMouseMove
                        );
                      };
                      window.addEventListener("mouseup", listener);

                      break;
                    }
                    default:
                      break;
                  }
                }}
                onMouseUp={() => node.setPosition(node.position, true)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <div>{node.name}</div>
              </div>
            }
          >
            {(_) => {
              const [value, setValue] = createSignal(node.name);

              let ref: HTMLInputElement | undefined;

              onMount(() => ref?.focus());

              return (
                <div class="px-2 pt-1">
                  <input
                    class="text-black p-0 pl-0.5 -mt-0.5 -ml-0.5 text-xs select-all outline-none"
                    type="text"
                    ref={ref}
                    value={value()}
                    onInput={(e) => setValue(e.target.value)}
                    onBlur={() => {
                      if (value() !== "") node.name = value();
                      node.graph.project.save();

                      setEditingName(false);
                    }}
                    onContextMenu={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </div>
              );
            }}
          </Show>
        </div>
        <div class="flex flex-row gap-2">
          <div class="p-2 flex flex-col space-y-2.5">
            <For each={node.inputs}>
              {(i) => (
                <Switch>
                  <Match when={i instanceof DataInputModel ? i : null}>
                    {(i) => <DataInput input={i()} />}
                  </Match>
                  <Match when={i instanceof ExecInputModel ? i : null}>
                    {(i) => <ExecInput input={i()} />}
                  </Match>
                </Switch>
              )}
            </For>
          </div>
          <div class="p-2 ml-auto flex flex-col space-y-2.5 items-end">
            <For each={node.outputs}>
              {(o) => (
                <Switch>
                  <Match when={o instanceof DataOutputModel ? o : null}>
                    {(o) => <DataOutput output={o()} />}
                  </Match>
                  <Match when={o instanceof ExecOutputModel ? o : null}>
                    {(o) => <ExecOutput output={o()} />}
                  </Match>
                </Switch>
              )}
            </For>
          </div>
        </div>
      </div>
    </NodeProvider>
  );
};
