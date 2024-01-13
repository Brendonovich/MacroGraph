import { createEnum, createStruct } from "@macrograph/runtime";
import { Maybe, t } from "@macrograph/typesystem";
import { ChatCompletionAssistantMessageParam } from "openai/resources";

import { Pkg } from ".";
import { Ctx } from "./ctx";

export function register(pkg: Pkg, state: Ctx) {
  pkg.createNonEventSchema({
    name: "Azure Send Text",
    variant: "Exec",
    generateIO({ io }) {
      return {
        message: io.dataInput({
          id: "message",
          name: "Message",
          type: t.string(),
        }),
      };
    },
    async run({ ctx, io }) {
      try {
        state.state().unwrap().speakTextAsync(ctx.getInput(io.message));
        console.log("it worked");
      } catch (err) {
        console.log(err);
      }
    },
  });
}
