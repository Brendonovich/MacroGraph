import { t } from "@macrograph/typesystem";
import { writeBinaryFile } from "@tauri-apps/api/fs";

import type { Pkg } from ".";
import type { Ctx } from "./ctx";
import { createStruct } from "@macrograph/runtime";
import { Maybe, None } from "@macrograph/option";

type Message = {
  role: string;
  content: string;
};

type Choices = {
  finish_reason: string;
  index: number;
  message: Message;
};

export async function streamToArrayBuffer(
  stream: ReadableStream<Uint8Array>
): Promise<Uint8Array> {
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function TextToSpeech(
  voiceID: string,
  body: any,
  filePath: string,
  ctx: Ctx
) {
  let state: string | null;

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceID}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "xi-api-key": ctx.key().unwrap(),
      },
      body: JSON.stringify(body),
    }
  );

  console.log(response);

  if (response.body && response.status === 200) {
    await writeBinaryFile(filePath, await streamToArrayBuffer(response.body));
    state = filePath;
  } else {
    state = null;
  }

  return state;
}

const voiceSettings = createStruct("Voice Settings", (s) => ({
  stability: s.field("Stability", t.float()),
  similarityBoost: s.field("Similarity Boost", t.float()),
  style: s.field("Style", t.option(t.float())),
  useSpeakerBoost: s.field("Use Speaker Boost", t.option(t.bool())),
}));

const elevenBody = createStruct("Body", (s) => ({
  modelId: s.field("Model ID", t.option(t.string())),
  language_code: s.field("Language Code", t.option(t.string())),
  voiceSettings: s.field("Voice Settings", t.option(t.struct(voiceSettings))),
  seed: s.field("Seed", t.option(t.int())),
  previousText: s.field("Previous Text", t.option(t.string())),
  nextText: s.field("Next Text", t.option(t.string())),
}));

export function register(pkg: Pkg, state: Ctx) {
  pkg.createNonEventSchema({
    name: "ElevenLabs TTS",
    variant: "Exec",
    createIO({ io }) {
      return {
        text: io.dataInput({
          id: "text",
          name: "Text",
          type: t.string(),
        }),
        filePath: io.dataInput({
          id: "filePath",
          name: "File Path",
          type: t.string(),
        }),
        voiceId: io.dataInput({
          id: "voiceId",
          name: "Voice ID",
          type: t.string(),
        }),
        // Waiting for bug to be fixed
        // body: io.dataInput({
        //   id: "body",
        //   name: "Body",
        //   type: t.option(t.struct(elevenBody)),
        // }),
        filePathOut: io.dataOutput({
          id: "filePathOut",
          name: "File Path",
          type: t.option(t.string()),
        }),
      };
    },
    async run({ ctx, io }) {
      const response = await TextToSpeech(
        ctx.getInput(io.voiceId),
        { text: ctx.getInput(io.text) },
        ctx.getInput(io.filePath),
        state
      );

      ctx.setOutput(io.filePathOut, Maybe(response));
    },
  });
}
