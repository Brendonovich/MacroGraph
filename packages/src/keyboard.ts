import { Package } from "@macrograph/core";
import { t } from "@macrograph/typesystem";

export function pkg() {
  const pkg = new Package<{
    [K in `${Lowercase<Alphabet>}-key`]: {
      state: "pressed" | "released";
    };
  }>({
    name: "Keyboard Inputs",
  });

  const pressedKeys = new Set<Lowercase<Alphabet>>();

  window.addEventListener("keydown", (e) => {
    if (e.key < "a" || e.key > "z") return;

    const key: Lowercase<Alphabet> = e.key as any;

    pressedKeys.add(key);

    pkg.emitEvent({ name: `${key}-key`, data: { state: "pressed" } });
  });

  window.addEventListener("keyup", (e) => {
    if (e.key < "a" || e.key > "z") return;

    const key: Lowercase<Alphabet> = e.key as any;

    pressedKeys.delete(key);

    pkg.emitEvent({ name: `${key}-key`, data: { state: "released" } });
  });

  alphabet.forEach((a) => {
    pkg.createEventSchema({
      name: `${a} Key`,
      event: `${toLowercase(a)}-key`,
      generateIO({ io }) {
        return {
          pressed: io.execOutput({
            id: "pressed",
            name: "Pressed",
          }),
          released: io.execOutput({
            id: "released",
            name: "Released",
          }),
        };
      },
      run({ ctx, data, io }) {
        ctx.exec(data.state === "pressed" ? io.pressed : io.released);
      },
    });
  });

  alphabet.forEach((a) => {
    pkg.createNonEventSchema({
      name: `${a} Key Pressed`,
      variant: "Pure",
      generateIO({ io }) {
        return io.dataOutput({
          id: "value",
          type: t.bool(),
        });
      },
      run({ ctx, io }) {
        ctx.setOutput(io, pressedKeys.has(a.toLowerCase() as any));
      },
    });
  });

  return pkg;
}

const alphabet = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
] as const;

type Alphabet = (typeof alphabet)[number];

function toLowercase<T extends string>(c: T): Lowercase<T> {
  return c.toLowerCase() as any;
}
