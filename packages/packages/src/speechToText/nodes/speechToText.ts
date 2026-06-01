import { t } from "@macrograph/typesystem";
import type { Pkg } from "..";

export function register(pkg: Pkg) {
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
        confidence: io.dataOutput({
          id: "confidence",
          name: "Confidence",
          type: t.float(),
        }),
        isFinal: io.dataOutput({
          id: "isFinal",
          name: "Is Final",
          type: t.bool(),
        }),
      };
    },
    run({ ctx: runCtx, data, io }) {
      runCtx.setOutput(io.text, data.text);
      runCtx.setOutput(io.confidence, data.confidence ?? 1);
      runCtx.setOutput(io.isFinal, data.isFinal ?? true);
      runCtx.exec(io.exec);
    },
  });
}
