import {
  DataInput,
  ExecInput,
  ExecOutput,
  Maybe,
  ScopeInput,
  ScopeOutput,
} from "@macrograph/core";
import clsx from "clsx";
import { createEffect, createMemo, For, Match, Show, Switch } from "solid-js";

import { useUIStore } from "../../../UIStore";
import { useGraphContext } from "../Graph";
import { colour } from "../util";

export const ConnectionRender = () => {
  const { pinPositions, ...graph } = useGraphContext();

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

  const graphOffset = () => graph.state.offset;
  const scale = () => graph.state.scale;

  let canvasRef: HTMLCanvasElement;

  createEffect(() => {
    const ctx = canvasRef.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 2560, 1440);
    [...graph.model().nodes.values()].forEach((node) => {
      node.state.inputs.forEach((i) => {
        const connectionData = () => {
          const connections =
            i instanceof ExecInput
              ? [...i.connections]
              : i.connection.map((c) => [c]).unwrapOr([]);

          return connections.map((conn) => {
            const inputPosition = Maybe(pinPositions.get(i));
            const outputPosition = Maybe(pinPositions.get(conn));

            return inputPosition.zip(outputPosition).map(([input, output]) => ({
              input,
              output,
            }));
          });
        };
        connectionData().forEach((data) => {
          data.peek((positions) => {
            ctx.lineWidth = 2 * scale();
            ctx.beginPath();
            ctx.moveTo(positions.input.x, positions.input.y);
            ctx.lineTo(positions.output.x, positions.output.y);
            ctx.strokeStyle = i instanceof DataInput ? colour(i.type) : "white";
            ctx.stroke();
          });
        });
      });
    });
  });

  return <canvas ref={canvasRef!} width="2560" height="1440" />;
};
