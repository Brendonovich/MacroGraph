import { makePersisted } from "@macrograph/runtime";
import { None, Option, Some } from "@macrograph/typesystem";
import { createEffect, createSignal, on } from "solid-js";
import {
  SpeechConfig,
  AudioConfig,
  SpeechSynthesizer,
} from "microsoft-cognitiveservices-speech-sdk";

const AZURE_KEY = "AzureKey";

export type Ctx = ReturnType<typeof createCtx>;

export function createCtx() {
  const [state, setState] = createSignal<Option<SpeechSynthesizer>>(None);

  const [key, setKey] = makePersisted(
    createSignal<Option<string>>(None),
    AZURE_KEY
  );

  const audioConfig = AudioConfig.fromDefaultSpeakerOutput();

  createEffect(
    on(
      () => key(),
      (key) => {
        key.map((key) => {
          const speechConfig = SpeechConfig.fromSubscription(key, "eastus");
          let api = new SpeechSynthesizer(speechConfig, audioConfig);
          setState(Some(api));
        });
      }
    )
  );

  return { key, setKey, state, setState };
}
