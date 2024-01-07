import { Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";

let sounds = new Map<string, HTMLAudioElement>();

export function pkg(args: { prepareURL(url: string): string }) {
  const pkg = new Package({
    name: "Audio",
  });

  pkg.createNonEventSchema({
    name: "Play Audio File",
    variant: "Exec",
    generateIO({ io }) {
      return {
        file: io.dataInput({
          id: "file",
          name: "File Location",
          type: t.string(),
        }),
        id: io.dataInput({
          id: "id",
          name: "ID",
          type: t.string(),
        }),
        volume: io.dataInput({
          id: "volume",
          name: "Volume",
          type: t.int(),
        }),
        idOut: io.dataOutput({
          id: "idOut",
          name: "ID",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      let id = ctx.getInput(io.id);
      ctx.setOutput(io.idOut, id);
      if (ctx.getInput(io.file).startsWith("http")) {
        let mysound = new Audio(ctx.getInput(io.file));
        mysound.volume = ctx.getInput(io.volume) / 100;
        mysound.play();
      } else {
        let mysound = new Audio(args.prepareURL(ctx.getInput(io.file)));
        mysound.volume = ctx.getInput(io.volume) / 100;
        mysound.play();
        sounds.set(id, mysound);
        mysound.onended = () => {
          pkg.emitEvent({ name: "AudioStopped", data: { id } });
          sounds.delete(id);
        };
      }
    },
  });

  pkg.createEventSchema({
    event: "AudioStopped",
    name: "Audio Stopped Playing",
    generateIO: ({ io }) => {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        id: io.dataOutput({
          id: "id",
          name: "ID",
          type: t.string(),
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.setOutput(io.id, data.id);
      ctx.exec(io.exec);
    },
  });

  pkg.createNonEventSchema({
    name: "Stop Audio",
    variant: "Exec",
    generateIO({ io }) {
      return {
        id: io.dataInput({
          id: "id",
          name: "Reference ID",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      let id = ctx.getInput(io.id);
      if (sounds.has(id)) {
        let playing = sounds.get(ctx.getInput(io.id));
        playing!.pause();
        pkg.emitEvent({ name: "AudioStopped", data: { id } });
      }
    },
  });

  pkg.createNonEventSchema({
    name: "Set Audio Volume",
    variant: "Exec",
    generateIO({ io }) {
      return {
        id: io.dataInput({
          id: "id",
          name: "Reference ID",
          type: t.string(),
        }),
        volume: io.dataInput({
          id: "volume",
          type: t.int(),
        }),
      };
    },
    run({ ctx, io }) {
      let id = ctx.getInput(io.id);
      if (sounds.has(id)) {
        let playing = sounds.get(ctx.getInput(io.id));
        playing!.volume = ctx.getInput(io.volume) / 100;
      }
    },
  });

  pkg.createNonEventSchema({
    name: "Stop All Audio",
    variant: "Exec",
    generateIO({ io }) {
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
