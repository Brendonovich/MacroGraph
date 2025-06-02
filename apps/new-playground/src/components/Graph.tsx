import {
  ComponentProps,
  createEffect,
  createRoot,
  createSignal,
  For,
  onCleanup,
  Show,
} from "solid-js";
import {
  createEventListener,
  createEventListenerMap,
} from "@solid-primitives/event-listener";
import { createElementBounds } from "@solid-primitives/bounds";
import { batch } from "solid-js";
import { ReactiveMap } from "@solid-primitives/map";
import { createMousePosition } from "@solid-primitives/mouse";
import { mergeRefs } from "@solid-primitives/refs";

import { PackageMeta } from "../shared";
import { NodeRoot, NodeHeader } from "./Node";
import { Node as NodeData, NodeId } from "../domain/Node/data";
import { DeepWriteable } from "../types";
import { isTouchDevice } from "../util";

export type IORef = `${NodeId}:${"i" | "o"}:${string}`;

export function parseIORef(ioRef: IORef) {
  const [nodeId, type, ...id] = ioRef.split(":");
  return {
    nodeId: NodeId.make(Number(nodeId)),
    type: type as "i" | "o",
    id: id.join(""),
  };
}

export const ioPositions = new ReactiveMap<IORef, { x: number; y: number }>();

export type GraphTwoWayConnections = Record<
  NodeId,
  {
    in?: Record<string, Array<[NodeId, string]>>;
    out?: Record<string, Array<[NodeId, string]>>;
  }
>;

export function Graph(
  props: {
    nodes: DeepWriteable<NodeData>[];
    packages: Record<string, PackageMeta>;
    onNodeMoved?(nodeId: NodeId, position: { x: number; y: number }): void;
    onSelectionMoved?(items: Array<[NodeId, { x: number; y: number }]>): void;
    selection: Set<NodeId>;
    onItemsSelected?(selection: Set<NodeId>): void;
    onConnectIO?(from: IORef, to: IORef): void;
    onDisconnectIO?(io: IORef): void;
    onContextMenu?(position: { x: number; y: number }): void;
    onContextMenuClose?(): void;
    connections: GraphTwoWayConnections;
  } & Pick<ComponentProps<"div">, "ref" | "children">,
) {
  const [dragState, setDragState] = createSignal<
    | { type: "idle" }
    | {
        type: "dragArea";
        topLeft: { x: number; y: number };
        bottomRight: { x: number; y: number };
      }
    | { type: "dragIO"; ioRef: IORef; pointerId: number }
    | {
        type: "dragSelection";
        positions: Array<[NodeId, { x: number; y: number }]>;
      }
  >({ type: "idle" });

  function getGraphPosition(e: MouseEvent) {
    return { x: e.clientX, y: e.clientY };
  }

  const [ref, setRef] = createSignal<HTMLDivElement | null>(null);
  const bounds = createElementBounds(ref);

  const mouse = createMousePosition();

  const connections = () => {
    const ret: {
      from: { x: number; y: number };
      to: { x: number; y: number };
    }[] = [];

    const draggingIO = (() => {
      const s = dragState();
      if (s.type === "dragIO") return s.ioRef;
    })();

    if (draggingIO) {
      const position = ioPositions.get(draggingIO);

      if (position) {
        const mousePos = {
          x: mouse.x - (bounds.left ?? 0),
          y: mouse.y - (bounds.top ?? 0),
        };

        ret.push(
          draggingIO.includes(":o:")
            ? { from: position, to: mousePos }
            : { to: position, from: mousePos },
        );
      }
    }

    for (const [outNodeId, outConnections] of Object.entries(
      props.connections,
    )) {
      if (!outConnections.out) continue;
      for (const [outId, inputs] of Object.entries(outConnections.out)) {
        const outPosition = ioPositions.get(
          `${NodeId.make(Number(outNodeId))}:o:${outId}`,
        );
        if (!outPosition) continue;

        for (const [inNodeId, inId] of inputs) {
          const inPosition = ioPositions.get(
            `${NodeId.make(Number(inNodeId))}:i:${inId}`,
          );
          if (!inPosition) continue;

          ret.push({ from: outPosition, to: inPosition });
        }
      }
    }

    return ret;
  };

  return (
    <div
      {...props}
      ref={mergeRefs(setRef, props.ref)}
      class="relative flex-1 flex flex-col gap-4 items-start w-full touch-none select-none"
      onPointerDown={(downEvent) => {
        if (downEvent.button === 0) {
          downEvent.preventDefault();
          props.onContextMenuClose?.();
          const topLeft = {
            x: downEvent.clientX - (bounds.left ?? 0),
            y: downEvent.clientY - (bounds.top ?? 0),
          };

          batch(() => {
            props.onItemsSelected?.(new Set());
            setDragState((s) => {
              if (s.type !== "idle") return s;

              createRoot((dispose) => {
                let timeout = setTimeout(() => {
                  if (isTouchDevice) {
                    props.onContextMenu?.({
                      x: downEvent.clientX - (bounds.left ?? 0),
                      y: downEvent.clientY - (bounds.top ?? 0),
                    });
                  }
                }, 300);

                createEventListenerMap(window, {
                  pointermove: (moveEvent) => {
                    if (downEvent.pointerId !== moveEvent.pointerId) return;
                    clearTimeout(timeout);

                    setDragState((s) => {
                      if (s.type !== "dragArea") return s;
                      return {
                        ...s,
                        bottomRight: {
                          x: moveEvent.clientX - (bounds.left ?? 0),
                          y: moveEvent.clientY - (bounds.top ?? 0),
                        },
                      };
                    });
                  },
                  pointerup: (upEvent) => {
                    if (downEvent.pointerId !== upEvent.pointerId) return;

                    dispose();
                  },
                });

                onCleanup(() => {
                  try {
                    clearTimeout(timeout);
                  } catch {}
                  setDragState({ type: "idle" });
                });
              });

              return {
                type: "dragArea",
                topLeft,
                bottomRight: topLeft,
              };
            });
          });
        }
      }}
      onContextMenu={(e) => {
        if (!props.onContextMenu) return;
        e.preventDefault();
        props.onContextMenu?.({
          x: e.clientX - (bounds.left ?? 0),
          y: e.clientY - (bounds.top ?? 0),
        });
      }}
    >
      <Connections
        width={bounds.width ?? 0}
        height={bounds.height ?? 0}
        top={bounds.top ?? 0}
        left={bounds.left ?? 0}
        connections={connections()}
      />
      <For each={props.nodes}>
        {(node) => {
          const pkg = () => props.packages[node.schema.pkgId];
          const schema = () => pkg()?.schemas[node.schema.schemaId];

          return (
            <Show when={schema()}>
              {(schema) => (
                <NodeRoot
                  {...node}
                  graphBounds={{ top: bounds.top ?? 0, left: bounds.left ?? 0 }}
                  position={(() => {
                    const ds = dragState();

                    if (ds.type !== "dragSelection") return node.position;
                    return (
                      ds.positions.find((p) => p[0] === node.id)?.[1] ??
                      node.position
                    );
                  })()}
                  selected={props.selection.has(node.id)}
                  onPinDragStart={(e, type, id) => {
                    if (dragState().type !== "idle") return false;

                    setDragState({
                      type: "dragIO",
                      ioRef: `${node.id}:${type}:${id}`,
                      pointerId: e.pointerId,
                    });

                    return true;
                  }}
                  onPinDragEnd={() => {
                    setDragState({ type: "idle" });
                  }}
                  onPinPointerUp={(e, type, id) => {
                    const dragIO = (() => {
                      const s = dragState();
                      if (s.type === "dragIO") return s;
                    })();
                    if (!dragIO || e.pointerId !== dragIO.pointerId) return;

                    props.onConnectIO?.(
                      dragIO.ioRef,
                      `${node.id}:${type}:${id}`,
                    );
                  }}
                  onPinDoubleClick={(type, id) => {
                    props.onDisconnectIO?.(`${node.id}:${type}:${id}`);
                  }}
                  connections={{
                    in: [
                      ...Object.entries(props.connections[node.id]?.in ?? {}),
                    ].flatMap(([id, connections]) => {
                      if (connections.length > 0) return id;
                      return [];
                    }),
                    out: [
                      ...Object.entries(props.connections[node.id]?.out ?? {}),
                    ].flatMap(([id, connections]) => {
                      if (connections.length > 0) return id;
                      return [];
                    }),
                  }}
                >
                  <NodeHeader
                    name={node.name ?? schema().name ?? schema().id}
                    variant={schema().type}
                    onPointerDown={(downEvent) => {
                      if (downEvent.button === 0) {
                        downEvent.stopPropagation();

                        if (downEvent.shiftKey) {
                          if (props.selection.has(node.id)) {
                            props.selection.delete(node.id);
                            props.onItemsSelected?.(new Set(props.selection));
                          } else {
                            props.onItemsSelected?.(
                              new Set([...props.selection, node.id]),
                            );
                          }
                        } else if (props.selection.size <= 1)
                          props.onItemsSelected?.(new Set([node.id]));

                        const startPositions: Array<
                          [NodeId, { x: number; y: number }]
                        > = [];
                        props.selection.forEach((nodeId) => {
                          const node = props.nodes.find((n) => n.id === nodeId);
                          if (!node) return;
                          startPositions.push([nodeId, { ...node.position }]);
                        });

                        const downPosition = getGraphPosition(downEvent);

                        createRoot((dispose) => {
                          createEventListenerMap(window, {
                            pointermove: (moveEvent) => {
                              if (downEvent.pointerId !== moveEvent.pointerId)
                                return;

                              moveEvent.preventDefault();

                              const movePosition = getGraphPosition(moveEvent);

                              const delta = {
                                x: movePosition.x - downPosition.x,
                                y: movePosition.y - downPosition.y,
                              };

                              const positions = startPositions.map(
                                ([nodeId, startPosition]) =>
                                  [
                                    nodeId,
                                    {
                                      x: startPosition.x + delta.x,
                                      y: startPosition.y + delta.y,
                                    },
                                  ] satisfies [any, any],
                              );

                              props.onSelectionMoved?.(positions);

                              setDragState({
                                type: "dragSelection",
                                positions,
                              });
                            },
                            pointerup: (upEvent) => {
                              if (downEvent.pointerId !== upEvent.pointerId)
                                return;

                              const upPosition = getGraphPosition(upEvent);

                              const delta = {
                                x: upPosition.x - downPosition.x,
                                y: upPosition.y - downPosition.y,
                              };

                              props.onSelectionMoved?.(
                                startPositions.map(
                                  ([nodeId, startPosition]) => [
                                    nodeId,
                                    {
                                      x: startPosition.x + delta.x,
                                      y: startPosition.y + delta.y,
                                    },
                                  ],
                                ),
                              );

                              setDragState({ type: "idle" });

                              dispose();
                            },
                          });
                        });
                      }
                    }}
                  />

                  {/* <Tooltip placement="top-start" gutter={4}>
                    <Tooltip.Trigger<ValidComponent> />
                    <Tooltip.Portal>
                      <Tooltip.Content class="bg-black/90 text-xs flex flex-row p-1.5 rounded space-x-2 ui-expanded:(animate-in fade-in slide-in-from-bottom-1) ui-closed:(animate-out fade-out slide-out-to-bottom-1)">
                        <div class="flex flex-col text-gray-11 space-y-0.5">
                          <span>Package</span>
                          <span>Schema</span>
                        </div>
                        <div class="flex flex-col space-y-0.5">
                          <pre>{node.schema.pkgId}</pre>
                          <pre>{schema().id}</pre>
                        </div>
                      </Tooltip.Content>
                    </Tooltip.Portal>
                  </Tooltip> */}
                </NodeRoot>
              )}
            </Show>
          );
        }}
      </For>
      <Show
        when={(() => {
          const s = dragState();
          if (s.type === "dragArea") return s;
        })()}
      >
        {(dragState) => (
          <div
            class="absolute left-0 top-0 ring-1 ring-yellow-500 bg-yellow-500/10 rounded"
            style={{
              width: `${Math.abs(dragState().bottomRight.x - dragState().topLeft.x)}px`,
              height: `${Math.abs(dragState().bottomRight.y - dragState().topLeft.y)}px`,
              transform: `translate(${Math.min(dragState().topLeft.x, dragState().bottomRight.x)}px, ${Math.min(dragState().topLeft.y, dragState().bottomRight.y)}px)`,
            }}
          />
        )}
      </Show>
      {props.children}
    </div>
  );
}

function Connections(props: {
  width: number;
  height: number;
  top: number;
  left: number;
  connections: Array<{
    from: { x: number; y: number };
    to: { x: number; y: number };
  }>;
}) {
  const [ref, setRef] = createSignal<HTMLCanvasElement | null>(null);

  createEffect(() => {
    const canvas = ref();
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scale = window.devicePixelRatio;

    // canvas.width = Math.floor(props.width * scale);
    // canvas.height = Math.floor(props.height * scale);

    ctx.scale(scale, scale);

    ctx.globalAlpha = 0.75;

    ctx.clearRect(0, 0, props.width, props.height);

    for (const { from, to } of props.connections) {
      const xDiff = from.x - to.x;
      const cpMagnitude = Math.abs(Math.min(200, xDiff / 2));

      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.bezierCurveTo(
        from.x + cpMagnitude,
        from.y,
        to.x - cpMagnitude,
        to.y,
        to.x,
        to.y,
      );
      ctx.strokeStyle = "white";
      ctx.stroke();
    }

    ctx.scale(1 / scale, 1 / scale);
  });

  return (
    <canvas
      ref={setRef}
      class="absolute inset-0 w-full h-full"
      width={props.width * window.devicePixelRatio}
      height={props.height * window.devicePixelRatio}
    />
  );
}
