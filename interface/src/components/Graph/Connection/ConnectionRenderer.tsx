import {
  DataInput,
  ExecInput,
  ExecOutput,
  Maybe,
  ScopeInput,
  ScopeOutput,
  XY,
} from "@macrograph/core";
import clsx from "clsx";
import { createEffect, createMemo, For, Match, Show, Switch } from "solid-js";

import { useUIStore } from "../../../UIStore";
import { useGraphContext } from "../Graph";
import { colour } from "../util";

export const ConnectionRender = () => {
  const { pinPositions, ...graph } = useGraphContext();

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
    const ctx = canvasRef.getContext("2d");
    if (!ctx) return;

    function drawConnection(
      ctx: CanvasRenderingContext2D,
      from: XY,
      to: XY,
      colour: string
    ) {
      ctx.lineWidth = 2 * graph.state.scale;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = colour;
      ctx.stroke();
    }

    ctx.clearRect(0, 0, 2560, 1440);
    ctx.globalAlpha = 0.75;

    for (const node of graph.model().nodes.values()) {
      for (const input of node.state.inputs) {
        const connections =
          input instanceof ExecInput
            ? [...input.connections]
            : input.connection.map((c) => [c]).unwrapOr([]);

        for (const conn of connections) {
          const inputPosition = Maybe(pinPositions.get(input));
          const outputPosition = Maybe(pinPositions.get(conn));

          inputPosition
            .zip(outputPosition)
            .map(([input, output]) => ({
              input,
              output,
            }))
            .peek((data) => {
              drawConnection(
                ctx,
                data.input,
                data.output,
                input instanceof DataInput ? colour(input.type) : "white"
              );
            });
        }
      }
    }

    const dragState = getDragState();
    if (dragState) {
      const pinPos = pinPositions.get(dragState.draggingPin);

      const diffs = {
        x: dragState.mouseDragLocation.x - graph.state.offset.x,
        y: dragState.mouseDragLocation.y - graph.state.offset.y,
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

      if (pinPos) drawConnection(ctx, pinPos, diffs, colourClass);
    }
  });

  return <canvas ref={canvasRef!} width="2560" height="1440" />;
};
