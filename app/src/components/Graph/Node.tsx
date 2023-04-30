import clsx from "clsx";
import { For, Match, Switch, createSignal, onCleanup } from "solid-js";
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
  Exec: "bg-blue-exec",
  Base: "bg-gray-base",
  Event: "bg-red-event",
  Pure: "bg-green-pure",
};

export const Node = (props: Props) => {
  const node = props.node;
  const graph = useGraph();
  const UI = useUIStore();

  const ACTIVE = NODE_EMIT.subscribe((data) => {
    if(node.id === data.id && data.schema === node.schema){
      updateActive(1);
      setTimeout(() => {
        updateActive(0);
      }, 500);
    }

  })

  const [active, updateActive] = createSignal(0);

  onCleanup(ACTIVE);

  const handleMouseMove = (e: MouseEvent) => {
    const scale = UI.state.scale;

    node.setPosition({
      x: node.position.x + e.movementX / scale,
      y: node.position.y + e.movementY / scale,
    });
  };

  return (
    <NodeProvider node={node}>
      <div
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
            "h-6 px-2 pt-1 duration-100 text-md font-medium cursor-pointer outline-none",
            active() === 1 ? "active-fade-out" :
            SchemaVariantColours[
              "variant" in node.schema ? node.schema.variant : "Event"
            ]
          )}
          onKeyDown={(e) => {
            switch (e.key) {
              case "Backspace":
              case "Delete": {
                graph.deleteNode(node.id);
                break;
              }
            }
          }}
          tabIndex={-1}
          onMouseDown={(e) => {
            e.currentTarget.focus();
            e.stopPropagation();
            e.preventDefault();
            switch (e.button) {
              case 0: {
                UI.setSelectedNode(node);

                window.addEventListener("mousemove", handleMouseMove);
                const listener = () => {
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
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {node.schema.name}
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
