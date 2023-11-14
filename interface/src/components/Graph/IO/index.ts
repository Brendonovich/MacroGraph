export * from "./DataInput";
export * from "./DataPin";
export * from "./ExecInput";
export * from "./ExecOutput";
export * from "./DataOutput";
export * from "./ScopeInput";
export * from "./ScopeOutput";

import { Pin, pinIsInput, pinIsOutput, pinsCanConnect } from "@macrograph/core";
import {
  batch,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from "solid-js";
import { useUIStore } from "../../../UIStore";
import { useGraphContext } from "../Graph";

export const usePin = (pin: Pin) => {
  const graph = useGraphContext();

  const [getRef, ref] = createSignal<HTMLDivElement>(null!);

  const UI = useUIStore();

  const mouseState = createMemo(() => ({
    hovering: UI.state.hoveringPin === pin,
    dragging: UI.state.draggingPin === pin,
  }));

  const handleMouseDrag = (e: MouseEvent) => {
    UI.setDraggingPin(pin);
    UI.setMouseDragLocation({
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleMouseUp = () => {
    UI.setDraggingPin();
    window.removeEventListener("mouseup", handleMouseUp);
    window.removeEventListener("mousemove", handleMouseDrag);
  };

  let justMouseUpped = false;

  createEffect(() => {
    const ref = getRef();

    const handlers = {
      mouseover: () => {
        const draggingPin = UI.state.draggingPin;

        if (
          !draggingPin ||
          (pinIsOutput(draggingPin) &&
            pinIsInput(pin) &&
            pinsCanConnect(draggingPin, pin)) ||
          (pinIsOutput(pin) &&
            pinIsInput(draggingPin) &&
            pinsCanConnect(pin, draggingPin))
        )
          UI.setHoveringPin(pin);
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

          UI.setHoveringPin(pin);

          const draggingPin = UI.state.draggingPin;

          if (!draggingPin || draggingPin === pin) return;

          if (pinIsOutput(pin) && pinIsInput(draggingPin))
            graph.model().connectPins(pin, draggingPin);
          else if (pinIsInput(pin) && pinIsOutput(draggingPin))
            graph.model().connectPins(draggingPin, pin);

          UI.setDraggingPin();
        });
      },
      mousedown: () => {
        window.addEventListener("mouseup", handleMouseUp);
        window.addEventListener("mousemove", handleMouseDrag);
      },
      dblclick: () => {
        graph.model().disconnectPin(pin);
      },
    };

    for (const [type, handler] of Object.entries(handlers)) {
      ref.addEventListener(type, handler);
    }

    onCleanup(() => {
      for (const [type, handler] of Object.entries(handlers)) {
        ref.removeEventListener(type, handler);
      }
    });
  });

  createEffect(() => {
    graph.state.translate.x;
    graph.state.translate.y;
    graph.state.scale;

    pin.node.state.position.x;
    pin.node.state.position.y;

    let rect = getRef().getBoundingClientRect();

    if (rect)
      graph.pinPositions.set(pin, {
        x: rect.x + rect.width / 2 - graph.state.offset.x,
        y: rect.y + rect.height / 2 - graph.state.offset.y,
      });
  });

  return {
    ref,
    active: () => mouseState().hovering || mouseState().dragging,
  };
};
