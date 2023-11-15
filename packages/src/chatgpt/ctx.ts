import { None, OnEvent, Option, Some, makePersisted } from "@macrograph/core";
import { createEffect, createSignal, on, onCleanup } from "solid-js";
import OpenAI from "openai";

const GPT_KEY = "ChatGptKey";

export type Ctx = ReturnType<typeof createCtx>;

export function createCtx() {
  const [state, setState] = createSignal<Option<OpenAI>>(None);

  const [key, setKey] = makePersisted(
    createSignal<Option<string>>(None),
    GPT_KEY
  );

  createEffect(
    on(
      () => key(),
      (key) => {
        key.map((key) => {
          let api = new OpenAI({
            apiKey: key,
            dangerouslyAllowBrowser: true,
          });
          setState(Some(api));
        });
      }
    )
  );

  return { key, setKey, state, setState };
}
