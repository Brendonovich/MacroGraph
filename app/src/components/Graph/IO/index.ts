export * from "./DataInput";
export * from "./DataPin";
export * from "./ExecInput";
export * from "./ExecOutput";
export * from "./DataOutput";

import { Pin, pinIsInput, pinIsOutput, pinsCanConnect } from "@macrograph/core";
import {
  batch,
  createEffect,
  createMemo,
  createSignal,
  onMount,
} from "solid-js";
import { useUIStore } from "~/UIStore";
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

  onMount(() => {
    let justMouseUpped = false;

    const ref = getRef();

    ref.addEventListener("mouseover", () => {
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
    });
    ref.addEventListener("mouseleave", () => {
      if (justMouseUpped) return;
      UI.setHoveringPin();
    });
    ref.addEventListener("mouseup", () => {
      batch(() => {
        // Necessary since safari fires 'mouseleave' just after mouseup. i hate this.
        justMouseUpped = true;
        setTimeout(() => (justMouseUpped = false), 1);

        UI.setHoveringPin(pin);

        const draggingPin = UI.state.draggingPin;

        if (!draggingPin || draggingPin === pin) return;

        if (pinIsOutput(pin) && pinIsInput(draggingPin))
          graph.connectPins(pin, draggingPin);
        else if (pinIsInput(pin) && pinIsOutput(draggingPin))
          graph.connectPins(draggingPin, pin);

        UI.setDraggingPin();
      });
    });
    ref.addEventListener("mousedown", () => {
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("mousemove", handleMouseDrag);
    });
    ref.addEventListener("dblclick", () => {
      pin.disconnect();
    });
  });

  createEffect(() => {
    UI.state.translate.x;
    UI.state.translate.y;
    UI.state.scale;

    pin.node.position.x;
    pin.node.position.y;

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
