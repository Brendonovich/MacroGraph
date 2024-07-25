import { Maybe } from "@macrograph/option";
import {
  DataInput,
  ExecInput,
  ExecOutput,
  ScopeInput,
  ScopeOutput,
  type XY,
  pinIsOutput,
  splitIORef,
} from "@macrograph/runtime";
import { createMousePosition } from "@solid-primitives/mouse";
import { createEffect } from "solid-js";

import type { GraphBounds } from "../../..";
import { useInterfaceContext } from "../../../context";
import { useGraphContext } from "../Context";
import { colour } from "../util";

export const ConnectionRenderer = (props: { graphBounds: GraphBounds }) => {
  const interfaceCtx = useInterfaceContext();
  const ctx = useGraphContext();

  const mousePosition = createMousePosition();

  const getDragState = () => {
    const { state } = interfaceCtx;

    if (
      state.status === "pinDragMode" ||
      state.status === "connectionAssignMode"
    ) {
      if (state.state.status !== "schemaMenuOpen")
        return { pin: state.pin, mousePosition };

      return { pin: state.pin, mousePosition: state.state.position };
    }

    return null;
  };

  let canvasRef: HTMLCanvasElement;

  createEffect(() => {
    const canvas = canvasRef.getContext("2d");
    if (!canvas) return;

    function drawConnection(
      canvas: CanvasRenderingContext2D,
      colour: string,
      from: XY,
      to: XY,
      cp1: XY,
      cp2: XY
    ) {
      canvas.lineWidth = 3 * ctx.state.scale;
      canvas.beginPath();
      canvas.moveTo(from.x, from.y);
      canvas.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, to.x, to.y);
      canvas.strokeStyle = colour;
      canvas.stroke();
    }

    canvas.clearRect(0, 0, props.graphBounds.width, props.graphBounds.height);
    canvas.globalAlpha = 0.75;

    const graph = ctx.model();

    for (const [refStr, conns] of graph.connections) {
      const outRef = splitIORef(refStr);
      if (outRef.type === "i") continue;

      const output = graph.nodes.get(outRef.nodeId)?.output(outRef.ioId);
      if (!output) continue;

      for (const conn of conns) {
        const inRef = splitIORef(conn);

        const input = graph.nodes.get(inRef.nodeId)?.input(inRef.ioId);

        if (!input || !output) continue;

        const inputPosition = Maybe(ctx.pinPositions.get(input));
        const outputPosition = Maybe(ctx.pinPositions.get(output));

        inputPosition
          .zip(outputPosition)
          .map(([input, output]) => ({
            input: {
              x: input.x - props.graphBounds.x,
              y: input.y - props.graphBounds.y,
            },
            output: {
              x: output.x - props.graphBounds.x,
              y: output.y - props.graphBounds.y,
            },
          }))
          .peek((data) => {
            const xDiff = data.input.x - data.output.x;
            const cpMagnitude = Math.abs(Math.min(200, xDiff / 2));

            drawConnection(
              canvas,
              input instanceof DataInput ? colour(input.type) : "white",
              data.input,
              data.output,
              {
                x: data.input.x - cpMagnitude,
                y: data.input.y,
              },
              {
                x: data.output.x + cpMagnitude,
                y: data.output.y,
              }
            );
          });
      }
    }

    const dragState = getDragState();
    if (dragState) {
      const pinPos = Maybe(ctx.pinPositions.get(dragState.pin)).map((pos) => ({
        x: pos.x - props.graphBounds.x,
        y: pos.y - props.graphBounds.y,
      }));

      const diffs = {
        x: dragState.mousePosition.x - props.graphBounds.x,
        y: dragState.mousePosition.y - props.graphBounds.y,
      };

      const colourClass = (() => {
        const draggingPin = dragState.pin;

        if (
          draggingPin instanceof ExecInput ||
          draggingPin instanceof ExecOutput ||
          draggingPin instanceof ScopeOutput ||
          draggingPin instanceof ScopeInput
        )
          return "white";

        return colour(draggingPin.type);
      })();

      pinPos.peek((pinPos) => {
        const xDiff = pinPos.x - diffs.x;
        const cpMagnitude = Math.abs(Math.min(200, xDiff / 2));

        drawConnection(
          canvas,
          colourClass,
          pinPos,
          diffs,
          {
            x: pinPos.x + cpMagnitude * (+pinIsOutput(dragState.pin) * 2 - 1),
            y: pinPos.y,
          },
          {
            x: diffs.x - cpMagnitude * (+pinIsOutput(dragState.pin) * 2 - 1),
            y: diffs.y,
          }
        );
      });
    }

    const s = ctx.schemaMenuDrag();
    if (s) {
      const pinPos = Maybe(ctx.pinPositions.get(s.pin)).map((pos) => ({
        x: pos.x - props.graphBounds.x,
        y: pos.y - props.graphBounds.y,
      }));

      const diffs = {
        x: s.mousePos.x - props.graphBounds.x,
        y: s.mousePos.y - props.graphBounds.y,
      };

      const colourClass = (() => {
        const draggingPin = s.pin;

        if (
          draggingPin instanceof ExecInput ||
          draggingPin instanceof ExecOutput ||
          draggingPin instanceof ScopeOutput ||
          draggingPin instanceof ScopeInput
        )
          return "white";

        return colour(draggingPin.type);
      })();

      pinPos.peek((pinPos) => {
        const xDiff = pinPos.x - diffs.x;
        const cpMagnitude = Math.abs(Math.min(200, xDiff / 2));

        drawConnection(
          canvas,
          colourClass,
          pinPos,
          diffs,
          {
            x: pinPos.x + cpMagnitude * (+pinIsOutput(s.pin) * 2 - 1),
            y: pinPos.y,
          },
          {
            x: diffs.x - cpMagnitude * (+pinIsOutput(s.pin) * 2 - 1),
            y: diffs.y,
          }
        );
      });
    }
  });

  return (
    <canvas
      ref={canvasRef!}
      class="absolute inset-0"
      width={props.graphBounds.width}
      height={props.graphBounds.height}
    />
  );
};
