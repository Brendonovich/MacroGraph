import { t } from "@macrograph/typesystem";
import type { Pkg } from "..";
import type { CaptureManager } from "../runtime/capture";

export function register(pkg: Pkg, capture: CaptureManager) {
  pkg.createEventSchema({
    event: "speech",
    name: "Speech to Text",
    createIO({ io }) {
      return {
        exec: io.execOutput({ id: "exec" }),
        text: io.dataOutput({
          id: "text",
          name: "Text",
          type: t.string(),
        }),
      };
    },
    run({ ctx: runCtx, data, io }) {
      runCtx.setOutput(io.text, data.text);
      runCtx.exec(io.exec);
    },
  });

  pkg.createSchema({
    name: "Start Capture",
    type: "exec",
    createIO() {
      return {};
    },
    async run() {
      await capture.start();
    },
  });

  pkg.createSchema({
    name: "Stop Capture",
    type: "exec",
    createIO() {
      return {};
    },
    run() {
      capture.stop();
    },
  });
}
