import {
  DataInput,
  DataOutput,
  ExecInput,
  ExecOutput,
  type Pin,
  pinIsInput,
  pinIsOutput,
  pinsCanConnect,
  ScopeInput,
  ScopeOutput,
} from "@macrograph/runtime";
import { createEventListenerMap } from "@solid-primitives/event-listener";
import {
  type Accessor,
  batch,
  createEffect,
  createMemo,
  createRoot,
  createSignal,
} from "solid-js";

import { useUIStore } from "../../../UIStore";
import { useInterfaceContext } from "../../../context";
import { useGraphContext } from "../Context";

export function usePin(pin: Accessor<Pin>) {
  const interfaceCtx = useInterfaceContext();
  const graph = useGraphContext();

  const [getRef, ref] = createSignal<HTMLDivElement | null>(null!);

  const UI = useUIStore();

  const schemaMenuPin = () =>
    interfaceCtx.state.status === "schemaMenuOpen"
      ? interfaceCtx.state.suggestion?.pin
      : undefined;

  const mouseState = createMemo(() => ({
    hovering: UI.state.hoveringPin === pin(),
    dragging:
      interfaceCtx.state.status === "draggingPin" &&
      interfaceCtx.state.pin === pin(),
  }));

  let justMouseUpped = false;

  createEffect(() => {
    const thisPin = pin();

    const ref = getRef();
    if (!ref) return;

    createEventListenerMap(ref, {
      mouseover: () => {
        const draggingPin = schemaMenuPin();

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
          setTimeout(() => {
            justMouseUpped = false;
          }, 1);

          if (interfaceCtx.state.status !== "draggingPin") return;
          const draggingPin = interfaceCtx.state.pin;

          UI.setHoveringPin(thisPin);

          if (!draggingPin || draggingPin === thisPin) return;

          if (pinIsOutput(thisPin) && pinIsInput(draggingPin))
            graph.model().connectPins(thisPin, draggingPin);
          else if (pinIsInput(thisPin) && pinIsOutput(draggingPin))
            graph.model().connectPins(draggingPin, thisPin);

          interfaceCtx.setState({ status: "idle" });
        });
      },
      mousedown: () => {
        interfaceCtx.setState({ status: "mouseDownOnPin", pin: thisPin });

        createRoot((dispose) => {
          let hasLeft = false;
          createEventListenerMap(ref, {
            keypress: (e) => {
              console.log(e);
            },
            mouseenter: () => {
              hasLeft = false;
              interfaceCtx.setState({ status: "mouseDownOnPin", pin: thisPin });
            },
            mouseleave: () => {
              hasLeft = true;
            },
          });
          createEventListenerMap(window, {
            keydown: (e) => {
              if (e.code === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                dispose();
                interfaceCtx.setState({ status: "idle" });
              }
            },
            mouseup: () => dispose(),
            mousemove: (e) => {
              if (!hasLeft) return;
              interfaceCtx.setState({
                status: "draggingPin",
                pin: thisPin,
                mousePosition: {
                  x: e.clientX,
                  y: e.clientY,
                },
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
    pin().node.state.foldPins;
    graph.state.translate.x;
    graph.state.translate.y;
    graph.state.scale;

    pin().node.state.position.x;
    pin().node.state.position.y;

    const ref = getRef();
    if (!ref) return;

    const rect = ref.getBoundingClientRect();

    if (rect)
      graph.pinPositions.set(pin(), {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
      });
  });

  const dim = createMemo(() => {
    const p = pin();

    if (interfaceCtx.state.status !== "draggingPin") return false;
    const draggingPin = interfaceCtx.state.pin;

    if (p === draggingPin) return false;

    if (pinIsInput(p) && pinIsOutput(draggingPin))
      return !pinsCanConnect(draggingPin, p);

    if (pinIsOutput(p) && pinIsInput(draggingPin))
      return !pinsCanConnect(p, draggingPin);

    return true;
  });

  return {
    ref,
    active: () =>
      mouseState().hovering ||
      mouseState().dragging ||
      schemaMenuPin() === pin(),
    dim,
  };
}
