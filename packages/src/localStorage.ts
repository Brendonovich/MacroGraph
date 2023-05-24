import { core, t, Option, Maybe } from "@macrograph/core";

const pkg = core.createPackage({
  name: "Localstorage",
});

pkg.createNonEventSchema({
  name: "Set Data",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      id: "key",
      name: "Key",
      type: t.string(),
    });
    io.dataInput({
      id: "value",
      name: "Value",
      type: t.string(),
    });
  },
  run({ ctx }) {
    localStorage.setItem(`value-${ctx.getInput("key")}`, ctx.getInput("value"));
  },
});

pkg.createNonEventSchema({
  name: "Get Data",
  variant: "Pure",
  generateIO: (io) => {
    io.dataInput({
      id: "key",
      name: "Key",
      type: t.string(),
    });
    io.dataOutput({
      id: "output",
      name: "Data",
      type: t.option(t.string()),
    });
  },
  run({ ctx }) {
    const data = localStorage.getItem(`value-${ctx.getInput("key")}`);
    const opt = Maybe(data);
    ctx.setOutput("output", opt);
  },
});

pkg.createNonEventSchema({
  name: "Remove Data",
  variant: "Exec",
  generateIO: (io) => {
    io.dataInput({
      id: "key",
      name: "Key",
      type: t.string(),
    });
  },
  run({ ctx }) {
    localStorage.removeItem(`value-${ctx.getInput("key")}`);
  },
});
