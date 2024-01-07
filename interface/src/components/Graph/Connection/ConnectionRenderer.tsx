import {
  DataInput,
  ExecInput,
  ExecOutput,
  ScopeInput,
  ScopeOutput,
  XY,
  splitIORef,
} from "@macrograph/runtime";
import { Maybe } from "@macrograph/typesystem";
import { createEffect } from "solid-js";

import { useUIStore } from "../../../UIStore";
import { useGraphContext } from "../Graph";
import { colour } from "../util";
import { GraphBounds } from "../../..";

export const ConnectionRender = (props: { graphBounds: GraphBounds }) => {
  const ctx = useGraphContext();

  const UI = useUIStore();

  const getDragState = () => {
    if (UI.state.mouseDragLocation && UI.state.draggingPin) {
      return {
        mouseDragLocation: UI.state.mouseDragLocation,
        draggingPin: UI.state.draggingPin,
      };
    }
    return null;
  };

  let canvasRef: HTMLCanvasElement;

  createEffect(() => {
    const canvas = canvasRef.getContext("2d");
    if (!canvas) return;

    function drawConnection(
      canvas: CanvasRenderingContext2D,
      from: XY,
      to: XY,
      colour: string
    ) {
      canvas.lineWidth = 2 * ctx.state.scale;
      canvas.beginPath();
      canvas.moveTo(from.x, from.y);
      canvas.lineTo(to.x, to.y);
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
            input,
            output,
          }))
          .peek((data) => {
            drawConnection(
              canvas,
              data.input,
              data.output,
              input instanceof DataInput ? colour(input.type) : "white"
            );
          });
      }
    }

    // for (const node of ctx.model().nodes.values()) {
    //   for (const input of node.state.inputs) {
    //     const connections =
    //       input instanceof ExecInput
    //         ? [...input.connections]
    //         : input.connection.map((c) => [c]).unwrapOr([]);

    //     for (const conn of connections) {
    //       const inputPosition = Maybe(ctx.pinPositions.get(input));
    //       const outputPosition = Maybe(ctx.pinPositions.get(conn));

    //       inputPosition
    //         .zip(outputPosition)
    //         .map(([input, output]) => ({
    //           input,
    //           output,
    //         }))
    //         .peek((data) => {
    //           drawConnection(
    //             canvas,
    //             data.input,
    //             data.output,
    //             input instanceof DataInput ? colour(input.type) : "white"
    //           );
    //         });
    //     }
    //   }
    // }

    const dragState = getDragState();
    if (dragState) {
      const pinPos = ctx.pinPositions.get(dragState.draggingPin);

      const diffs = {
        x: dragState.mouseDragLocation.x - props.graphBounds.x,
        y: dragState.mouseDragLocation.y - props.graphBounds.y,
      };

      const colourClass = (() => {
        const draggingPin = dragState.draggingPin;

        if (
          draggingPin instanceof ExecInput ||
          draggingPin instanceof ExecOutput ||
          draggingPin instanceof ScopeOutput ||
          draggingPin instanceof ScopeInput
        )
          return "white";

        return colour(draggingPin.type);
      })();

      if (pinPos) drawConnection(canvas, pinPos, diffs, colourClass);
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
