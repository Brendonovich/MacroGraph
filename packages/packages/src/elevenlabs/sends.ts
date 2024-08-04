import { t } from "@macrograph/typesystem";
import { writeBinaryFile } from "@tauri-apps/api/fs";

import type { Pkg } from ".";
import type { Ctx } from "./ctx";

type Message = {
  role: string;
  content: string;
};

type Choices = {
  finish_reason: string;
  index: number;
  message: Message;
};

async function TextToSpeech(voiceID: string, body: any, directory: string) {
  await writeBinaryFile(directory, new Uint8Array([]));
}

export function register(pkg: Pkg, state: Ctx) {
  pkg.createNonEventSchema({
    name: "ElevenLabs TTS",
    variant: "Base",
    createIO({ io }) {
      return {
        exec: io.execInput({
          id: "exec",
        }),
        voice: io.dataInput({
          id: "voice",
          name: "Voice",
          type: t.string(),
        }),
        directory: io.dataInput({
          id: "directory",
          name: "Directory",
          type: t.string(),
        }),
      };
    },
    async run({ ctx, io }) {
      await TextToSpeech("", "");
      // const audio = await state.state().unwrap().generate({
      // 	stream: true,
      // 	voice: "IDEK",
      // 	text: "testing this out to see what it returns",
      // 	model_id: "eleven_multilingual_v2",
      // });
      // await play(audio);
    },
  });
}
