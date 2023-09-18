import { t, Maybe, createPackage } from "@macrograph/core";
import { JSON, jsonToJS, jsToJSON } from "./json";

export const pkg = createPackage({
  name: "Localstorage",
});

pkg.createNonEventSchema({
  name: "Set Data",
  variant: "Exec",
  generateIO: (io) => {
    return {
      key: io.dataInput({
        id: "key",
        name: "Key",
        type: t.string(),
      }),
      value: io.dataInput({
        id: "value",
        name: "Value",
        type: t.string(),
      }),
    };
  },
  run({ ctx, io }) {
    localStorage.setItem(
      `value-${ctx.getInput(io.key)}`,
      ctx.getInput(io.value)
    );
  },
});

pkg.createNonEventSchema({
  name: "Set JSON Data",
  variant: "Exec",
  generateIO: (io) => {
    return {
      key: io.dataInput({
        id: "key",
        name: "Key",
        type: t.string(),
      }),
      value: io.dataInput({
        id: "value",
        name: "Value",
        type: t.enum(JSON),
      }),
    };
  },
  run({ ctx, io }) {
    localStorage.setItem(
      `value-${ctx.getInput(io.key)}`,
      window.JSON.stringify(jsonToJS(ctx.getInput(io.value)))
    );
  },
});

pkg.createNonEventSchema({
  name: "Get Data",
  variant: "Pure",
  generateIO: (io) => {
    return {
      key: io.dataInput({
        id: "key",
        name: "Key",
        type: t.string(),
      }),
      output: io.dataOutput({
        id: "output",
        name: "Data",
        type: t.option(t.string()),
      }),
    };
  },
  run({ ctx, io }) {
    const data = localStorage.getItem(`value-${ctx.getInput(io.key)}`);
    const opt = Maybe(data);
    ctx.setOutput(io.output, opt);
  },
});

pkg.createNonEventSchema({
  name: "Get JSON Data",
  variant: "Pure",
  generateIO: (io) => {
    return {
      key: io.dataInput({
        id: "key",
        name: "Key",
        type: t.string(),
      }),
      output: io.dataOutput({
        id: "output",
        name: "Data",
        type: t.enum(JSON),
      }),
    };
  },
  run({ ctx, io }) {
    ctx.setOutput(
      io.output,
      Maybe(localStorage.getItem(`value-${ctx.getInput(io.key)}`))
        .map(window.JSON.parse)
        .andThen((parsed) => Maybe(jsToJSON(parsed)))
        .unwrap()
    );
  },
});

pkg.createNonEventSchema({
  name: "Remove Data",
  variant: "Exec",
  generateIO: (io) => {
    return io.dataInput({
      id: "key",
      name: "Key",
      type: t.string(),
    });
  },
  run({ ctx, io }) {
    localStorage.removeItem(`value-${ctx.getInput(io)}`);
  },
});
