import { ContextMenu } from "@kobalte/core/context-menu";
import {
  type IORefString,
  Node,
  type SchemaMeta,
  type SchemaRef,
} from "@macrograph/project-domain";
import { createElementBounds } from "@solid-primitives/bounds";
import {
  createEventListener,
  createEventListenerMap,
} from "@solid-primitives/event-listener";
import { ReactiveMap } from "@solid-primitives/map";
import { createMousePosition } from "@solid-primitives/mouse";
import { mergeRefs } from "@solid-primitives/refs";
import { cx } from "cva";
import { Option } from "effect";
import type { ValidComponent } from "solid-js";
import {
  type ComponentProps,
  For,
  Show,
  batch,
  createEffect,
  createRoot,
  createSignal,
  onCleanup,
} from "solid-js";

// import { useProjectService } from "../AppRuntime";
import { NodeHeader, NodeRoot } from "./Node";
// import { ProjectActions } from "../Project/Actions";
import type { GraphTwoWayConnections } from "./types";
import { isTouchDevice } from "./utils";
import { useGraphContext } from "./Context";

export const ioPositions = new ReactiveMap<
  IORefString,
  { x: number; y: number }
>();

export type GraphViewState = {
  scale?: number;
  translate?: { x: number; y: number };
  selection?: Array<Node.Id>;
};

export function GraphView(
  props: {
    nodes: Node.Shape[];
    connections?: GraphTwoWayConnections;
    selection?: Array<Node.Id>;
    getSchema: (ref: SchemaRef) => Option.Option<SchemaMeta>;
    remoteSelections?: Array<{ colour: string; nodes: Set<Node.Id> }>;
    onSelectionMoved?(items: Array<[Node.Id, { x: number; y: number }]>): void;
    onItemsSelected?(selection: Array<Node.Id>): void;
    onConnectIO?(from: IORefString, to: IORefString): void;
    onDisconnectIO?(io: IORefString): void;
    onContextMenu?(e: MouseEvent): void;
    onContextMenuClose?(): void;
    onDeleteSelection?(): void;
    onTranslateChange?(translate: { x: number; y: number }): void;
  } & Pick<ComponentProps<"div">, "ref" | "children">,
) {
  const [dragState, setDragState] = createSignal<
    | { type: "idle" }
    | {
        type: "dragArea";
        topLeft: { x: number; y: number };
        bottomRight: { x: number; y: number };
      }
    | { type: "dragIO"; ioRef: IORefString; pointerId: number }
    | {
        type: "dragSelection";
        positions: Array<[Node.Id, { x: number; y: number }]>;
      }
  >({ type: "idle" });

  const graphCtx = useGraphContext();
  const [ref, setRef] = createSignal<HTMLDivElement | undefined>();
  const bounds = createElementBounds(ref);
  const mouse = createMousePosition();

  createEventListener(ref, "wheel", (e) => {
    e.preventDefault();

    let deltaX = e.deltaX;
    let deltaY = e.deltaY;
    let isTouchpad = false;

    if (Math.abs((e as any).wheelDeltaY) === Math.abs(e.deltaY) * 3) {
      deltaX = -(e as any).wheelDeltaX / 3;
      deltaY = -(e as any).wheelDeltaY / 3;
      isTouchpad = true;
    }

    props.onTranslateChange?.({
      x: (graphCtx.translate?.x ?? 0) + deltaX,
      y: (graphCtx.translate?.y ?? 0) + deltaY,
    });
  });

  const connections = () => {
    const ret: {
      from: { x: number; y: number };
      to: { x: number; y: number };
      opacity?: number;
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
            ? { from: position, to: mousePos, opacity: 0.5 }
            : { to: position, from: mousePos, opacity: 0.5 },
        );
      }
    }

    for (const [outNodeId, outConnections] of Object.entries(
      props.connections ?? {},
    )) {
      if (!outConnections.out) continue;
      for (const [outId, inputs] of Object.entries(outConnections.out)) {
        const outPosition = ioPositions.get(
          `${Node.Id.make(Number(outNodeId))}:o:${outId}`,
        );
        if (!outPosition) continue;

        for (const [inNodeId, inId] of inputs) {
          const inPosition = ioPositions.get(
            `${Node.Id.make(Number(inNodeId))}:i:${inId}`,
          );
          if (!inPosition) continue;

          ret.push({ from: outPosition, to: inPosition });
        }
      }
    }

    // for (const { name, payload } of actions.pending) {
    //   if (name !== "ConnectIO") continue;

    //   const outPosition = ioPositions.get(
    //     `${Node.Id.make(Number(payload.output.nodeId))}:o:${
    //       payload.output.ioId
    //     }`,
    //   );
    //   if (!outPosition) continue;

    //   const inPosition = ioPositions.get(
    //     `${Node.Id.make(Number(payload.input.nodeId))}:i:${payload.input.ioId}`,
    //   );
    //   if (!inPosition) continue;

    //   ret.push({ from: outPosition, to: inPosition, opacity: 0.5 });
    // }

    return ret;
  };

  const getEventGraphPosition = (e: MouseEvent) =>
    graphCtx.getGraphPosition({
      x: e.clientX,
      y: e.clientY,
    });

  return (
    <div
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
            props.onItemsSelected?.([]);
            setDragState((s) => {
              if (s.type !== "idle") return s;

              createRoot((dispose) => {
                const timeout = setTimeout(() => {
                  if (isTouchDevice) {
                    props.onContextMenu?.(downEvent);
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
        props.onContextMenu?.(e);
      }}
    >
      <Connections
        connections={connections()}
        width={bounds.width ?? 0}
        height={bounds.height ?? 0}
        top={bounds.top ?? 0}
        left={bounds.left ?? 0}
      />
      <ContextMenu>
        <div
          class="origin-[0,0]"
          style={{
            transform: `translate(${(graphCtx.translate?.x ?? 0) * -1}px, ${
              (graphCtx.translate?.y ?? 0) * -1
            }px)`,
          }}
        >
          <For each={props.nodes}>
            {(node) => (
              <Show when={Option.getOrUndefined(props.getSchema(node.schema))}>
                {(schema) => (
                  <NodeRoot
                    {...node}
                    graphBounds={{
                      top: bounds.top ?? 0,
                      left: bounds.left ?? 0,
                    }}
                    position={(() => {
                      const ds = dragState();

                      if (ds.type !== "dragSelection") return node.position;
                      return (
                        ds.positions.find((p) => p[0] === node.id)?.[1] ??
                        node.position
                      );
                    })()}
                    selected={
                      props.selection?.some((id) => id === node.id) ||
                      props.remoteSelections?.find((s) => s.nodes.has(node.id))
                        ?.colour
                    }
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
                        ...Object.entries(
                          props.connections?.[node.id]?.in ?? {},
                        ),
                      ].flatMap(([id, connections]) => {
                        if (connections.length > 0) return id;
                        return [];
                      }),
                      out: [
                        ...Object.entries(
                          props.connections?.[node.id]?.out ?? {},
                        ),
                      ].flatMap(([id, connections]) => {
                        if (connections.length > 0) return id;
                        return [];
                      }),
                    }}
                  >
                    <ContextMenu.Trigger<ValidComponent>
                      as={(cmProps) => (
                        <NodeHeader
                          {...cmProps}
                          name={node.name ?? schema().name ?? schema().id}
                          variant={schema().type}
                          onPointerDown={(downEvent) => {
                            if (downEvent.button === 0) {
                              downEvent.stopPropagation();

                              if (downEvent.shiftKey) {
                                const index = props.selection?.findIndex(
                                  (id) => id === node.id,
                                );
                                if (index !== -1) {
                                  props.onItemsSelected?.(
                                    props.selection?.filter(
                                      (id) => node.id !== id,
                                    ) ?? [],
                                  );
                                } else {
                                  props.onItemsSelected?.([
                                    ...(props.selection ?? []),
                                    node.id,
                                  ]);
                                }
                              } else if ((props.selection?.length ?? 0) <= 1)
                                props.onItemsSelected?.([node.id]);

                              const startPositions: Array<
                                [Node.Id, { x: number; y: number }]
                              > = [];
                              for (const nodeId of props.selection ?? []) {
                                const node = props.nodes.find(
                                  (n) => n.id === nodeId,
                                );
                                if (!node) return;
                                startPositions.push([
                                  nodeId,
                                  { ...node.position },
                                ]);
                              }

                              const downPosition =
                                getEventGraphPosition(downEvent);

                              createRoot((dispose) => {
                                createEventListenerMap(window, {
                                  pointermove: (moveEvent) => {
                                    if (
                                      downEvent.pointerId !==
                                      moveEvent.pointerId
                                    )
                                      return;

                                    moveEvent.preventDefault();

                                    const movePosition =
                                      getEventGraphPosition(moveEvent);

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
                                    if (
                                      downEvent.pointerId !== upEvent.pointerId
                                    )
                                      return;

                                    const upPosition =
                                      getEventGraphPosition(upEvent);

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
                            } else if (downEvent.button === 2) {
                              downEvent.preventDefault();

                              if (
                                !props.selection?.some((id) => id === node.id)
                              )
                                props.onItemsSelected?.([node.id]);
                            }
                          }}
                        />
                      )}
                    />
                  </NodeRoot>
                )}
              </Show>
            )}
          </For>
        </div>
        <ContextMenu.Portal>
          <ContextMenu.Content<"div">
            class={cx(
              "absolute flex flex-col p-1 bg-gray-1 border border-gray-3 rounded-lg text-sm outline-none min-w-40 *:space-x-1",
              "origin-top-left ui-expanded:(animate-in fade-in zoom-in-95) ui-closed:(animate-out fade-out zoom-out-95)",
            )}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <ContextMenu.Item
              onSelect={() => {
                props.onDeleteSelection?.();
              }}
              class="flex flex-row items-center bg-transparent w-full text-left p-1 rounded @hover-bg-white/10 active:bg-white/10 outline-none"
            >
              <IconMaterialSymbolsDeleteOutline />
              <span>Delete</span>
            </ContextMenu.Item>
          </ContextMenu.Content>
        </ContextMenu.Portal>
      </ContextMenu>
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
              width: `${Math.abs(
                dragState().bottomRight.x - dragState().topLeft.x,
              )}px`,
              height: `${Math.abs(
                dragState().bottomRight.y - dragState().topLeft.y,
              )}px`,
              transform: `translate(${Math.min(
                dragState().topLeft.x,
                dragState().bottomRight.x,
              )}px, ${Math.min(
                dragState().topLeft.y,
                dragState().bottomRight.y,
              )}px)`,
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
    opacity?: number;
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

    for (const { from, to, opacity } of props.connections) {
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
      ctx.globalAlpha = 0.75 * (opacity ?? 1);
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
