import { createEnum, createStruct } from "@macrograph/core";
import { Maybe, t } from "@macrograph/typesystem";
import { ChatCompletionAssistantMessageParam } from "openai/resources";

import { Pkg } from ".";
import { Ctx } from "./ctx";

type Message = {
  role: string;
  content: string;
};

type Choices = {
  finish_reason: string;
  index: number;
  message: Message;
};

const message = createStruct("message", (s) => ({
  role: s.field("role", t.string()),
  content: s.field("content", t.string()),
}));

const model = createEnum("model", (e) => [
  e.variant("gpt-3.5-turbo"),
  e.variant("gpt-4"),
]);

export function register(pkg: Pkg, state: Ctx) {
  pkg.createNonEventSchema({
    name: "ChatGPT Message",
    variant: "Base",
    generateIO({ io }) {
      return {
        exec: io.execInput({
          id: "exec",
        }),
        message: io.dataInput({
          id: "message",
          name: "Message",
          type: t.string(),
        }),
        model: io.dataInput({
          id: "model",
          name: "Model",
          type: t.enum(model),
        }),
        historyIn: io.dataInput({
          id: "historyIn",
          name: "Chat History",
          type: t.list(t.map(t.string())),
        }),
        stream: io.scopeOutput({
          id: "stream",
          name: "Stream",
          scope: (s) => {
            s.output({
              id: "stream",
              name: "Response Stream",
              type: t.string(),
            });
          },
        }),
        complete: io.scopeOutput({
          id: "complete",
          name: "Completed",
          scope: (s) => {
            s.output({
              id: "response",
              name: "Response",
              type: t.string(),
            });
          },
        }),
      };
    },
    async run({ ctx, io }) {
      let history = ctx.getInput(io.historyIn);
      console.log(history);
      let array = [] as ChatCompletionAssistantMessageParam[];
      history.forEach((item) => {
        // console.log(item);
        array.push({
          role: item.get("role") as any,
          content: item.get("content") as any,
        });
      });
      console.log(array);
      let message = "";
      let stream = await state
        .state()
        .unwrap()
        .chat.completions.create({
          messages: [
            ...array,
            { role: "user", content: ctx.getInput(io.message) },
          ],
          model: ctx.getInput(io.model).variant,
          stream: true,
        });

      for await (const chunk of stream) {
        console.log(chunk);
        if (chunk.choices[0]?.finish_reason === "stop") {
          let array = [];

          ctx.execScope(io.complete, { response: message });
          return;
        }
        message += chunk.choices[0]?.delta.content;
        ctx.execScope(io.stream, { stream: message });
      }
    },
  });

  pkg.createNonEventSchema({
    name: "Dall E Image Generation",
    variant: "Exec",
    generateIO({ io }) {
      return {
        prompt: io.dataInput({
          id: "prompt",
          name: "Prompt",
          type: t.string(),
        }),
        url: io.dataOutput({
          id: "url",
          name: "Image URL",
          type: t.string(),
        }),
        revised: io.dataOutput({
          id: "revised",
          name: "Revised Prompt",
          type: t.option(t.string()),
        }),
      };
    },
    async run({ ctx, io }) {
      let stream = await state
        .state()
        .unwrap()
        .images.generate({
          model: "dall-e-3",
          prompt: ctx.getInput(io.prompt),
          response_format: "url",
          size: "1024x1024",
          style: "vivid",
        });

      const image = stream.data[0];
      if (!image) return;

      ctx.setOutput(io.url, image.url!);
      ctx.setOutput(io.revised, Maybe(image.revised_prompt));
    },
  });
}
