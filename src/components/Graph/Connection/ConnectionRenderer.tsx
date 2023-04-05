import { DataInput, ExecInput, ExecOutput } from "~/models";
import { PrimitiveType } from "~/bindings";
import { For, Match, Show, Switch } from "solid-js";
import { useUIStore } from "~/stores";
import { useGraph } from "../Graph";

const DataColourClasses: Record<PrimitiveType, string> = {
  bool: "text-red-bool",
  string: "text-pink-string",
  float: "text-green-float",
  int: "text-blue-int",
};

export const ConnectionRender = () => {
  const graph = useGraph();
  const UI = useUIStore();

  const dragState = () => {
    if (UI.state.mouseDragLocation && UI.state.draggingPin) {
      return {
        mouseDragLocation: UI.state.mouseDragLocation,
        draggingPin: UI.state.draggingPin,
      };
    }
    return null;
  };

  const graphOffset = () => UI.state.graphOffset;
  const scale = () => UI.state.scale;

  return (
    <svg class="w-full h-full transform">
      <g>
        <For each={[...graph.nodes.values()]}>
          {(n) => (
            <For each={n.inputs}>
              {(i) => (
                <Show when={i.connected && UI.state.pinPositions.get(i)}>
                  {(inputPos) => (
                    <Switch>
                      <Match when={i instanceof DataInput && i}>
                        {(i) => {
                          const outputPos = () =>
                            UI.state.pinPositions.get(i().connection!);

                          const colourClass = () => {
                            const input = i();

                            return input.type.variant === "primitive"
                              ? DataColourClasses[input.type.value]
                              : DataColourClasses[input.type.value.value];
                          };

                          return (
                            <Show when={outputPos()}>
                              {(outputPos) => (
                                <line
                                  class={colourClass()}
                                  x1={inputPos().x - graphOffset().x}
                                  y1={inputPos().y - graphOffset().y}
                                  x2={outputPos().x - graphOffset().x}
                                  y2={outputPos().y - graphOffset().y}
                                  stroke="currentColor"
                                  stroke-opacity={0.75}
                                  stroke-width={2 * UI.state.scale}
                                />
                              )}
                            </Show>
                          );
                        }}
                      </Match>
                      <Match when={i instanceof ExecInput && i}>
                        {(i) => {
                          const outputPos = () =>
                            UI.state.pinPositions.get(i().connection!);

                          return (
                            <Show when={outputPos()}>
                              {(outputPos) => (
                                <line
                                  x1={inputPos().x - graphOffset().x}
                                  y1={inputPos().y - graphOffset().y}
                                  x2={outputPos().x - graphOffset().x}
                                  y2={outputPos().y - graphOffset().y}
                                  stroke={"white"}
                                  stroke-opacity={0.75}
                                  stroke-width={2 * UI.state.scale}
                                />
                              )}
                            </Show>
                          );
                        }}
                      </Match>
                    </Switch>
                  )}
                </Show>
              )}
            </For>
          )}
        </For>
        <Show when={dragState()}>
          {(state) => {
            const pinPos = () => UI.state.pinPositions.get(state().draggingPin);
            const diffs = () => ({
              x: state().mouseDragLocation.x - graphOffset().x,
              y: state().mouseDragLocation.y - graphOffset().y,
            });

            const colourClass = () => {
              const draggingPin = state().draggingPin;

              if (
                draggingPin instanceof ExecInput ||
                draggingPin instanceof ExecOutput
              )
                return "text-white";

              if (draggingPin.type.variant === "primitive")
                return DataColourClasses[draggingPin.type.value];
              else return DataColourClasses[draggingPin.type.value.value];
            };

            return (
              <Show when={pinPos()}>
                {(pos) => (
                  <line
                    class={colourClass()}
                    x1={pos().x - graphOffset().x}
                    y1={pos().y - graphOffset().y}
                    x2={diffs().x}
                    y2={diffs().y}
                    stroke="currentColor"
                    stroke-opacity={0.75}
                    stroke-width={2 * scale()}
                  />
                )}
              </Show>
            );
          }}
        </Show>
      </g>
    </svg>
  );
};
