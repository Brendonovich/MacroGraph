import { Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
// import Speech from "speak-tts";
import { meSpeak } from "mespeak";

export function pkg() {
  const pkg = new Package({
    name: "TTS",
  });

  meSpeak.loadVoice("en/en-us");

  meSpeak.speak("test");

  //   const speech = new Speech();

  //   function languages() {
  //     return async () => {
  //       return [
  //         "ar-SA",
  //         "cs-CZ",
  //         "da-DK",
  //         "de-DE",
  //         "el-GR",
  //         "en",
  //         "en-AU",
  //         "en-GB",
  //         "en-IE",
  //         "en-IN",
  //         "en-US",
  //         "en-ZA",
  //         "es-AR",
  //         "es-ES",
  //         "es-MX",
  //         "es-US",
  //         "fi-FI",
  //         "fr-CA",
  //         "fr-FR",
  //         "he-IL",
  //         "hi-IN",
  //         "hu-HU",
  //         "id-ID",
  //         "it-IT",
  //         "ja-JP",
  //         "ko-KR",
  //         "nb-NO",
  //         "nl-BE",
  //         "nl-NL",
  //         "pl-PL",
  //         "pt-BR",
  //         "pt-PT",
  //         "ro-RO",
  //         "ru-RU",
  //         "sk-SK",
  //         "sv-SE",
  //         "th-TH",
  //         "tr-TR",
  //         "zh-CN",
  //         "zh-HK",
  //         "zh-TW",
  //       ];
  //     };
  //   }

  //   function getVoices() {
  //     return async () => {
  //       const voices = speech.init().then((data) => {
  //         console.log(data);
  //         return data.voices.map((x) => x.name);
  //       });
  //       return voices;
  //     };
  //   }

  //   pkg.createSchema({
  //     name: "TTS",
  //     type: "exec",
  //     createIO: ({ io, obs }) => ({
  //       text: io.dataInput({
  //         id: "text",
  //         name: "Text",
  //         type: t.string(),
  //       }),
  //       voice: io.dataInput({
  //         id: "voice",
  //         name: "Voice",
  //         type: t.string(),
  //         fetchSuggestions: getVoices(),
  //       }),
  //       volume: io.dataInput({
  //         id: "volume",
  //         name: "Volume",
  //         type: t.float(),
  //       }),
  //       rate: io.dataInput({
  //         id: "rate",
  //         name: "Rate",
  //         type: t.float(),
  //       }),
  //       pitch: io.dataInput({
  //         id: "pitch",
  //         name: "Pitch",
  //         type: t.float(),
  //       }),
  //       lang: io.dataInput({
  //         id: "lang",
  //         name: "Language",
  //         type: t.string(),
  //         fetchSuggestions: languages(),
  //       }),
  //     }),
  //     run({ ctx, io }) {
  //       const speech = new Speech();

  //       speech.setVoice(ctx.getInput(io.voice));
  //       speech.setLanguage(ctx.getInput(io.lang));
  //       speech.setPitch(ctx.getInput(io.pitch));
  //       speech.setRate(ctx.getInput(io.rate));
  //       speech.setVolume(ctx.getInput(io.volume));
  //       speech.speak({
  //         text: ctx.getInput(io.text),
  //       });
  //     },
  //   });

  return pkg;
}
