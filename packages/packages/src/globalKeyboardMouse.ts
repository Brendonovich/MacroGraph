import { Key, commands } from "tauri-plugin-kb-mouse";
import { Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";

export function pkg() {
  const pkg = new Package({
    name: "Global Mouse & Keyboard",
  });

  pkg.createSchema({
    name: "Emulate Keyboard Input",
    type: "exec",
    createIO: ({ io }) => ({
      keys: io.dataInput({
        id: "keys",
        name: "Keys",
        type: t.list(t.string()),
      }),
      delay: io.dataInput({
        id: "delay",
        name: "Release Delay",
        type: t.int(),
      }),
    }),
    async run({ ctx, io }) {
      await commands.simulateKeys(
        ctx.getInput(io.keys) as Key[],
        ctx.getInput(io.delay)
      );
    },
  });

  const Button = pkg.createEnum("Button", (e) => [
    e.variant("Left"),
    e.variant("Middle"),
    e.variant("Right"),
  ]);

  pkg.createSchema({
    name: "Emulate Mouse Input",
    type: "exec",
    createIO: ({ io }) => ({
      button: io.dataInput({
        id: "button",
        name: "Button",
        type: t.enum(Button),
      }),
      delay: io.dataInput({
        id: "delay",
        name: "Release Delay",
        type: t.int(),
      }),
    }),
    async run({ ctx, io }) {
      await commands.simulateMouse(
        ctx.getInput(io.button).variant,
        ctx.getInput(io.delay)
      );
    },
  });

  pkg.createSchema({
    name: "Set Mouse Position",
    type: "exec",
    createIO: ({ io }) => ({
      x: io.dataInput({
        id: "x",
        name: "X",
        type: t.float(),
      }),
      y: io.dataInput({
        id: "y",
        name: "Y",
        type: t.float(),
      }),
      absolute: io.dataInput({
        id: "absolute",
        name: "Absolute",
        type: t.bool(),
      }),
    }),
    async run({ ctx, io }) {
      await commands.setMousePosition(
        ctx.getInput(io.x),
        ctx.getInput(io.y),
        ctx.getInput(io.absolute)
      );
    },
  });

  return pkg;
}
