import { Interface, Platform, PlatformContext } from "@macrograph/interface";
import { save, open, ask } from "@tauri-apps/api/dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/api/fs";
import { makePersisted } from "@solid-primitives/storage";
import { createSignal } from "solid-js";
import { SerializedProject } from "@macrograph/runtime";
import { render } from "solid-js/web";

import { core } from "./core";

const [projectUrl, setProjectUrl] = makePersisted(
  createSignal<string | null>(null),
  { name: "currentProjectUrl" }
);

const platform: Platform = {
  projectPersistence: {
    async saveProject(saveAs = false) {
      let url = !saveAs ? projectUrl() : null;

      if (url === null) {
        url = await save({
          defaultPath: "macrograph-project.json",
          filters: [{ name: "JSON", extensions: ["json"] }],
        });
      }

      if (url === null) return;

      await writeTextFile(
        url,
        JSON.stringify(core.project.serialize(), null, 4)
      );

      setProjectUrl(url);
    },
    async loadProject() {
      if (await ask("Woudl you like to save this project?"))
        await this.saveProject();

      const url = await open({
        filters: [{ name: "JSON", extensions: ["json"] }],
        multiple: false,
      });

      if (typeof url !== "string") return;

      const data = await readTextFile(url);

      const serializedProject = SerializedProject.parse(JSON.parse(data));

      await core.load(serializedProject);

      setProjectUrl(url);
    },
    get url() {
      return projectUrl();
    },
  },
};

function App() {
  return (
    <PlatformContext.Provider value={platform}>
      <Interface core={core} environment="custom" />
    </PlatformContext.Provider>
  );
}

render(App, document.getElementById("app")!);

// type NoteOn = {
//   variant: "noteOn";
//   channel: number;
//   pitch: number;
//   velocity: number;
// };

// type NoteOff = {
//   variant: "noteOff";
//   channel: number;
//   pitch: number;
//   velocity: number;
// };

// type MidiMessage = NoteOn | NoteOff;

// type Tuple<T, N extends number> = N extends N
//   ? number extends N
//     ? T[]
//     : _TupleOf<T, N, []>
//   : never;
// type _TupleOf<T, N extends number, R extends unknown[]> = R["length"] extends N
//   ? R
//   : _TupleOf<T, N, [T, ...R]>;

// function arrayIsLength<const TLength extends number, TArrayElement>(
//   array: Array<TArrayElement>,
//   length: TLength
// ): array is Tuple<TArrayElement, TLength> {
//   return array.length === length;
// }

// import { midiAccess } from "tauri-plugin-midi";

// setTimeout(() => {
//   const input = midiAccess.inputs.get("Launchpad Open Standalone Port")!;
//   const output = midiAccess.outputs.get("Launchpad Open Standalone Port")!;

//   input.onmidimessage = ((event: MIDIMessageEvent) => {
//     const msg = Array.from(event.data);
//     if (msg[0] === undefined) return;

//     const status = msg[0] >> 4;

//     let parsedMessage: MidiMessage;

//     switch (status) {
//       case 0b1001: {
//         if (!arrayIsLength(msg, 3)) return;

//         parsedMessage = {
//           variant: "noteOn",
//           channel: msg[0] & 0b1111,
//           pitch: msg[1]!,
//           velocity: msg[2]!,
//         };

//         output.send([0b10011111, msg[1], msg[2]]);

//         break;
//       }
//       case 0b1000: {
//         if (!arrayIsLength(msg, 3)) return;

//         parsedMessage = {
//           variant: "noteOff",
//           channel: msg[0] & 0b1111,
//           pitch: msg[1]!,
//           velocity: msg[2]!,
//         };

//         output.send([0b10001111, msg[1], msg[2]]);

//         break;
//       }
//       default: {
//         return;
//       }
//     }

//     console.log(parsedMessage);
//   }) as any;
// }, 1000);
