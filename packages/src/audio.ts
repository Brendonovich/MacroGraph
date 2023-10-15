import { t, Package, Core } from "@macrograph/core";

import { convertFileSrc } from "@tauri-apps/api/tauri";

let sounds = new Map<string, HTMLAudioElement>();

export function pkg(core: Core) {
  const pkg = new Package({
    name: "Audio",
  });

  pkg.createNonEventSchema({
    name: "Play Audio File",
    variant: "Exec",
    generateIO(io) {
      return {
        file: io.dataInput({
          id: "file",
          name: "File Location",
          type: t.string(),
        }),
        volume: io.dataInput({
          id: "volume",
          name: "Volume",
          type: t.int(),
        }),
        uuid: io.dataOutput({
          id: "uuid",
          name: "Reference UUID",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      let uuid = crypto.randomUUID();
      ctx.setOutput(io.uuid, uuid);
      if (ctx.getInput(io.file).startsWith("http")) {
        let mysound = new Audio(ctx.getInput(io.file));
        mysound.volume = ctx.getInput(io.volume) / 100;
        mysound.play();
      } else {
        let mysound = new Audio(
          convertFileSrc(ctx.getInput(io.file)).replace(
            "asset://",
            "https://asset."
          )
        );
        mysound.volume = ctx.getInput(io.volume) / 100;
        mysound.play();
        sounds.set(uuid, mysound);
        mysound.onended = () => {
          sounds.delete(uuid);
        };
      }
    },
  });

  pkg.createNonEventSchema({
    name: "Stop Audio",
    variant: "Exec",
    generateIO(io) {
      return {
        uuid: io.dataInput({
          id: "uuid",
          name: "Reference UUID",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      let uuid = ctx.getInput(io.uuid);
      if (sounds.has(uuid)) {
        let playing = sounds.get(ctx.getInput(io.uuid));
        playing!.pause();
      }
    },
  });

  pkg.createNonEventSchema({
    name: "Set Audio Volume",
    variant: "Exec",
    generateIO(io) {
      return {
        uuid: io.dataInput({
          id: "uuid",
          name: "Reference UUID",
          type: t.string(),
        }),
        volume: io.dataInput({
          id: "volume",
          type: t.int(),
        }),
      };
    },
    run({ ctx, io }) {
      let uuid = ctx.getInput(io.uuid);
      if (sounds.has(uuid)) {
        let playing = sounds.get(ctx.getInput(io.uuid));
        playing!.volume = ctx.getInput(io.volume) / 100;
      }
    },
  });

  pkg.createNonEventSchema({
    name: "Stop All Audio",
    variant: "Exec",
    generateIO(io) {
      return {};
    },
    run({ ctx, io }) {
      for (const [key, value] of sounds.entries()) {
        value.pause();
      }
    },
  });

  return pkg;
}
