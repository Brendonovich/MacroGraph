import clsx from "clsx";
import * as Solid from "solid-js";
import {
  Node as NodeModel,
  DataInput as DataInputModel,
  DataOutput as DataOutputModel,
  ExecInput as ExecInputModel,
  ExecOutput as ExecOutputModel,
  ScopeInput as ScopeInputModel,
  ScopeOutput as ScopeOutputModel,
  NodeSchemaVariant,
  NODE_EMIT,
} from "@macrograph/runtime";
import { createEventListenerMap } from "@solid-primitives/event-listener";

import "./Node.css";
import { NodeProvider } from "../../contexts";
import { useGraphContext } from "./Graph";
import {
  DataInput,
  DataOutput,
  ExecInput,
  ExecOutput,
  ScopeOutput,
  ScopeInput,
} from "./IO";

interface Props {
  node: NodeModel;
  onSelected(): void;
}

const SchemaVariantColours: Record<NodeSchemaVariant, string> = {
  Exec: "bg-mg-exec",
  Base: "bg-mg-base",
  Event: "bg-mg-event",
  Pure: "bg-mg-pure",
};

export const Node = (props: Props) => {
  const node = () => props.node;

  const graph = useGraphContext();

  const ACTIVE = NODE_EMIT.subscribe(node(), (data) => {
    if (node().id === data.id && data.schema === node().schema) {
      updateActive(1);
      setTimeout(() => {
        updateActive(0);
      }, 200);
    }
  });

  const [active, updateActive] = Solid.createSignal(0);

  Solid.onCleanup(ACTIVE);

  const [editingName, setEditingName] = Solid.createSignal(false);

  let ref: HTMLDivElement | undefined;

  Solid.onMount(() => {
    if (!ref) return;

    const obs = new ResizeObserver((resize) => {
      const contentRect = resize[resize.length - 1]?.contentRect;

      if (!contentRect) return;

      graph.nodeSizes.set(node(), {
        width: contentRect.width,
        height: contentRect.height,
      });
    });

    obs.observe(ref);

    Solid.onCleanup(() => {
      obs.disconnect();
      graph.nodeSizes.delete(node());
    });
  });

  const isSelected = Solid.createMemo(() => {
    const selectedItem = graph.state.selectedItemId;
    return selectedItem?.type === "node" && selectedItem.id === node().id;
  });

  return (
    <NodeProvider node={node()}>
      <div
        ref={ref}
        class={clsx(
          "absolute top-0 left-0 text-[12px] overflow-hidden rounded-lg flex flex-col bg-black/75 border-black/75 border-2",
          isSelected() && "ring-2 ring-yellow-500"
        )}
        style={{
          transform: `translate(${node().state.position.x}px, ${
            node().state.position.y
          }px)`,
        }}
      >
        <div
          class={clsx(
            "h-6 duration-100 text-md font-medium",
            active() === 1 && "opacity-50",
            (() => {
              const schema = node().schema;
              return SchemaVariantColours[
                "variant" in schema ? schema.variant : "Event"
              ];
            })()
          )}
        >
          <Solid.Show
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
                      graph.model().deleteNode(node());
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
                      props.onSelected();

                      Solid.createRoot((dispose) => {
                        createEventListenerMap(window, {
                          mouseup: dispose,
                          mousemove: (e) => {
                            const scale = graph.state.scale;

                            node().setPosition({
                              x: node().state.position.x + e.movementX / scale,
                              y: node().state.position.y + e.movementY / scale,
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
                onMouseUp={() =>
                  node().setPosition(node().state.position, true)
                }
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <div>{node().state.name}</div>
              </div>
            }
          >
            {(_) => {
              const [value, setValue] = Solid.createSignal(node().state.name);

              let ref: HTMLInputElement | undefined;

              Solid.onMount(() => ref?.focus());

              return (
                <div class="px-2 pt-1">
                  <input
                    class="text-black p-0 pl-0.5 -mt-0.5 -ml-0.5 text-xs select-all outline-none"
                    type="text"
                    ref={ref}
                    value={value()}
                    onInput={(e) =>
                      setValue(
                        e.target.value === ""
                          ? node().schema.name
                          : e.target.value
                      )
                    }
                    onBlur={() => {
                      if (value() !== "") node().state.name = value();
                      node().graph.project.save();

                      setEditingName(false);
                    }}
                    onContextMenu={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                </div>
              );
            }}
          </Solid.Show>
        </div>
        <div class="flex flex-row gap-2">
          <div class="p-2 flex flex-col space-y-2.5">
            <Solid.For each={node().state.inputs}>
              {(i) => (
                <Solid.Switch>
                  <Solid.Match when={i instanceof DataInputModel ? i : null}>
                    {(i) => <DataInput input={i()} />}
                  </Solid.Match>
                  <Solid.Match when={i instanceof ExecInputModel ? i : null}>
                    {(i) => <ExecInput input={i()} />}
                  </Solid.Match>
                  <Solid.Match when={i instanceof ScopeInputModel ? i : null}>
                    {(i) => <ScopeInput input={i()} />}
                  </Solid.Match>
                </Solid.Switch>
              )}
            </Solid.For>
          </div>
          <div class="p-2 ml-auto flex flex-col space-y-2.5 items-end">
            <Solid.For each={node().state.outputs}>
              {(o) => (
                <Solid.Switch>
                  <Solid.Match when={o instanceof DataOutputModel ? o : null}>
                    {(o) => <DataOutput output={o()} />}
                  </Solid.Match>
                  <Solid.Match when={o instanceof ExecOutputModel ? o : null}>
                    {(o) => <ExecOutput output={o()} />}
                  </Solid.Match>
                  <Solid.Match when={o instanceof ScopeOutputModel ? o : null}>
                    {(o) => <ScopeOutput output={o()} />}
                  </Solid.Match>
                </Solid.Switch>
              )}
            </Solid.For>
          </div>
        </div>
      </div>
    </NodeProvider>
  );
};
