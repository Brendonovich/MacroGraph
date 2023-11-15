import { createEnum, t } from "@macrograph/core";
import { Pkg } from ".";
import { Ctx } from "./ctx";

export function register(pkg: Pkg, state: Ctx) {
  pkg.createNonEventSchema({
    name: "ChatGPT Send Message",
    variant: "Exec",
    generateIO(io) {
      return {
        message: io.dataInput({
          id: "message",
          name: "Message",
          type: t.string(),
        }),
        // response: io.dataOutput({
        //   id: "response",
        //   name: "Response",
        //   type: t.string(),
        // }),
        // parentMessageIdOut: io.dataOutput({
        //   id: "parentMessageId",
        //   name: "Parent message ID",
        //   type: t.string(),
        // }),
      };
    },
    async run({ ctx, io }) {
      let res = await state.state().api.chat.completions.create({
        messages: [{ role: "user", content: ctx.getInput(io.message) }],
        model: "gpt-3.5-turbo",
      });

      console.log(res);
      //   ctx.setOutput(io.response, res.text);
      //   ctx.setOutput(io.parentMessageIdOut, res.id);
    },
  });
}
