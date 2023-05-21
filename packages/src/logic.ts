import { core, types } from "@macrograph/core";

const pkg = core.createPackage({
  name: "Logic",
});

pkg.createNonEventSchema({
  name: "Branch",
  variant: "Base",
  run({ ctx }) {
    ctx.exec(ctx.getInput<boolean>("condition") ? "true" : "false");
  },
  generateIO(t) {
    t.execInput({
      id: "exec",
    });
    t.dataInput({
      id: "condition",
      name: "Condition",
      type: types.bool(),
    });

    t.execOutput({
      id: "true",
      name: "True",
    });
    t.execOutput({
      id: "false",
      name: "False",
    });
  },
});

pkg.createNonEventSchema({
  name: "Wait",
  variant: "Base",
  run({ ctx }) {
    setTimeout(() => {
      ctx.exec("output");
    }, ctx.getInput("delay"));
  },
  generateIO(t) {
    t.execInput({
      id: "exec",
    });
    t.dataInput({
      id: "delay",
      name: "Wait in ms",
      type: types.int(),
    });

    t.execOutput({
      id: "output",
      name: "",
    });
  },
});

pkg.createNonEventSchema({
  name: "AND",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput(
      "value",
      ctx.getInput<boolean>("one") && ctx.getInput<boolean>("two")
    );
  },
  generateIO(t) {
    t.dataInput({
      id: "one",
      type: types.bool(),
    });
    t.dataInput({
      id: "two",
      type: types.bool(),
    });
    t.dataOutput({
      id: "value",
      type: types.bool(),
    });
  },
});

pkg.createNonEventSchema({
  name: "NAND",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput(
      "value",
      !(ctx.getInput<boolean>("one") && ctx.getInput<boolean>("two"))
    );
  },
  generateIO(t) {
    t.dataInput({
      id: "one",
      type: types.bool(),
    });
    t.dataInput({
      id: "two",
      type: types.bool(),
    });
    t.dataOutput({
      id: "value",
      type: types.bool(),
    });
  },
});

pkg.createNonEventSchema({
  name: "OR",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput(
      "value",
      ctx.getInput<boolean>("one") || ctx.getInput<boolean>("two")
    );
  },
  generateIO(t) {
    t.dataInput({
      id: "one",
      type: types.bool(),
    });
    t.dataInput({
      id: "two",
      type: types.bool(),
    });
    t.dataOutput({
      id: "value",
      type: types.bool(),
    });
  },
});

pkg.createNonEventSchema({
  name: "NOR",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput(
      "value",
      !(ctx.getInput<boolean>("one") || ctx.getInput<boolean>("two"))
    );
  },
  generateIO(t) {
    t.dataInput({
      id: "one",
      type: types.bool(),
    });
    t.dataInput({
      id: "two",
      type: types.bool(),
    });
    t.dataOutput({
      id: "value",
      type: types.bool(),
    });
  },
});

pkg.createNonEventSchema({
  name: "XOR",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput(
      "value",
      ctx.getInput<boolean>("one") != ctx.getInput<boolean>("two")
    );
  },
  generateIO(t) {
    t.dataInput({
      id: "one",
      type: types.bool(),
    });
    t.dataInput({
      id: "two",
      type: types.bool(),
    });
    t.dataOutput({
      id: "value",
      type: types.bool(),
    });
  },
});

pkg.createNonEventSchema({
  name: "NOT",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput("output", !ctx.getInput<boolean>("input"));
  },
  generateIO(t) {
    t.dataInput({
      id: "input",
      type: types.bool(),
    });
    t.dataOutput({
      id: "output",
      type: types.bool(),
    });
  },
});

(
  [
    ["Bool", types.bool()],
    ["String", types.string()],
    ["Int", types.int()],
    ["Float", types.float()],
  ] as const
).forEach(([key, type]) => {
  pkg.createNonEventSchema({
    name: `Conditional ${key}`,
    variant: "Pure",
    run({ ctx }) {
      ctx.setOutput(
        "output",
        ctx.getInput("condition")
          ? ctx.getInput("trueValue")
          : ctx.getInput("falseValue")
      );
    },
    generateIO(t) {
      t.dataInput({
        id: "condition",
        name: "Condition",
        type: types.bool(),
      });
      t.dataInput({
        id: "trueValue",
        name: "True",
        type: type,
      });
      t.dataInput({
        id: "falseValue",
        name: "False",
        type: type,
      });
      t.dataOutput({
        id: "output",
        type: type,
      });
    },
  });

  pkg.createNonEventSchema({
    name: `For Each (${key})`,
    variant: "Base",
    async run({ ctx }) {
      for (const [index, data] of ctx.getInput<Array<any>>("array").entries()) {
        ctx.setOutput("output", data);
        ctx.setOutput("index", index);
        await ctx.exec("body");
      }

      ctx.exec("completed");
    },
    generateIO(t) {
      t.execInput({
        id: "exec",
      });
      t.dataInput({
        id: "array",
        name: "Array",
        type: types.list(type),
      });
      t.execOutput({
        id: "body",
        name: "Loop Body",
      });
      t.dataOutput({
        id: "element",
        name: "Array Element",
        type: type,
      });
      t.dataOutput({
        id: "index",
        name: "Array Index",
        type: types.int(),
      });
      t.execOutput({
        id: "completed",
        name: "Completed",
      });
    },
  });
});
