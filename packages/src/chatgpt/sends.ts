import { Maybe, Some, createEnum, createStruct, t } from "@macrograph/core";
import { Pkg } from ".";
import { Ctx } from "./ctx";
import { JSON, jsToJSON, jsonToJS } from "../json";
import {
  ChatCompletion,
  ChatCompletionAssistantMessageParam,
} from "openai/resources";
import { JSONSchema } from "openai/lib/jsonschema";

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

const choices = createStruct("choices", (s) => ({
  finish_reason: s.field("Finish Reason", t.string()),
  index: s.field("index", t.int()),
  message: s.field("message", t.struct(message)),
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
          type: t.option(t.list(t.enum(JSON))),
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
      let history = ctx.getInput(io.historyIn).unwrapOr([]);
      let array = [] as ChatCompletionAssistantMessageParam[];
      history.forEach((item) => {
        array.push(jsonToJS(item as any));
      });
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
}
