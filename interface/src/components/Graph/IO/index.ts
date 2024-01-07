export * from "./DataInput";
export * from "./DataPin";
export * from "./ExecInput";
export * from "./ExecOutput";
export * from "./DataOutput";
export * from "./ScopeInput";
export * from "./ScopeOutput";

import { Pin, pinIsInput, pinIsOutput, pinsCanConnect } from "@macrograph/runtime";
import {
  Accessor,
  batch,
  createEffect,
  createMemo,
  createRoot,
  createSignal,
  onCleanup,
} from "solid-js";
import { createEventListenerMap } from "@solid-primitives/event-listener";

import { useUIStore } from "../../../UIStore";
import { useGraphContext } from "../Graph";

export function usePin(pin: Accessor<Pin>) {
  const graph = useGraphContext();

  const [getRef, ref] = createSignal<HTMLDivElement | null>(null!);

  const UI = useUIStore();

  const mouseState = createMemo(() => ({
    hovering: UI.state.hoveringPin === pin(),
    dragging: UI.state.draggingPin === pin(),
  }));

  let justMouseUpped = false;

  createEffect(() => {
    const thisPin = pin();

    const ref = getRef();
    if (!ref) return;

    createEventListenerMap(ref, {
      mouseover: () => {
        const draggingPin = UI.state.draggingPin;

        if (
          !draggingPin ||
          (pinIsOutput(draggingPin) &&
            pinIsInput(thisPin) &&
            pinsCanConnect(draggingPin, thisPin)) ||
          (pinIsOutput(thisPin) &&
            pinIsInput(draggingPin) &&
            pinsCanConnect(thisPin, draggingPin))
        )
          UI.setHoveringPin(thisPin);
      },
      mouseleave: () => {
        if (justMouseUpped) return;
        UI.setHoveringPin();
      },
      mouseup: () => {
        batch(() => {
          // Necessary since safari fires 'mouseleave' just after mouseup. i hate this.
          justMouseUpped = true;
          setTimeout(() => (justMouseUpped = false), 1);

          UI.setHoveringPin(thisPin);

          const draggingPin = UI.state.draggingPin;

          if (!draggingPin || draggingPin === thisPin) return;

          if (pinIsOutput(thisPin) && pinIsInput(draggingPin))
            graph.model().connectPins(thisPin, draggingPin);
          else if (pinIsInput(thisPin) && pinIsOutput(draggingPin))
            graph.model().connectPins(draggingPin, thisPin);

          UI.setDraggingPin();
        });
      },
      mousedown: (e) => {
        createRoot((dispose) => {
          UI.setDraggingPin(thisPin);
          UI.setMouseDragLocation({
            x: e.clientX,
            y: e.clientY,
          });

          onCleanup(() => UI.setDraggingPin());

          createEventListenerMap(window, {
            mouseup: dispose,
            mousemove: (e) => {
              UI.setMouseDragLocation({
                x: e.clientX,
                y: e.clientY,
              });
            },
          });
        });
      },
      dblclick: () => {
        graph.model().disconnectPin(thisPin);
      },
    });
  });

  createEffect(() => {
    graph.state.translate.x;
    graph.state.translate.y;
    graph.state.scale;

    pin().node.state.position.x;
    pin().node.state.position.y;

    const ref = getRef();
    if (!ref) return;

    let rect = ref.getBoundingClientRect();

    if (rect)
      graph.pinPositions.set(pin(), {
        x: rect.x + rect.width / 2 - graph.offset.x,
        y: rect.y + rect.height / 2 - graph.offset.y,
      });
  });

  return {
    ref,
    active: () => mouseState().hovering || mouseState().dragging,
  };
}
