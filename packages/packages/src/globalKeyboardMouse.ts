import { Key, commands } from "tauri-plugin-rdev";
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
      const keys = ctx.getInput(io.keys);
      const delay = ctx.getInput(io.delay);

      await commands.simulateKeys(keys as Key[], delay);
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
      const button = ctx.getInput(io.button);
      const delay = ctx.getInput(io.delay);

      await commands.simulateMouse(button.variant, delay);
    },
  });

  return pkg;
}
