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
import { useGraph } from "../Graph";

export const usePin = (pin: Pin) => {
  const [getRef, ref] = createSignal<HTMLDivElement>(null!);

  const UI = useUIStore();

  const mouseState = createMemo(() => ({
    hovering: UI.state.hoveringPin === pin,
    dragging: UI.state.draggingPin === pin,
  }));

  const graph = useGraph();

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
            graph().connectPins(pin, draggingPin);
          else if (pinIsInput(pin) && pinIsOutput(draggingPin))
            graph().connectPins(draggingPin, pin);

          UI.setDraggingPin();
        });
      },
      mousedown: () => {
        window.addEventListener("mouseup", handleMouseUp);
        window.addEventListener("mousemove", handleMouseDrag);
      },
      dblclick: () => {
        graph().disconnectPin(pin);
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
    UI.state.translate.x;
    UI.state.translate.y;
    UI.state.scale;

    pin.node.state.position.x;
    pin.node.state.position.y;

    let rect = getRef().getBoundingClientRect();

    if (rect)
      UI.setPinPosition(pin, {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
      });
  });

  return {
    ref,
    active: () => mouseState().hovering || mouseState().dragging,
  };
};
