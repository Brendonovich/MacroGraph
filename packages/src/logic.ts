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

pkg.createNonEventSchema({
  name: `Conditional`,
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput(
      "output",
      ctx.getInput("condition")
        ? ctx.getInput("trueValue")
        : ctx.getInput("falseValue")
    );
  },
  generateIO(io) {
    const w = io.wildcard();

    io.dataInput({
      id: "condition",
      name: "Condition",
      type: types.bool(),
    });
    io.dataInput({
      id: "trueValue",
      name: "True",
      type: types.wildcard(w),
    });
    io.dataInput({
      id: "falseValue",
      name: "False",
      type: types.wildcard(w),
    });
    io.dataOutput({
      id: "output",
      type: types.wildcard(w),
    });
  },
});

pkg.createNonEventSchema({
  name: `For Each`,
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
    const w = t.wildcard();

    t.execInput({
      id: "exec",
    });
    t.dataInput({
      id: "array",
      name: "Array",
      type: types.list(types.wildcard(w)),
    });
    t.execOutput({
      id: "body",
      name: "Loop Body",
    });
    t.dataOutput({
      id: "element",
      name: "Array Element",
      type: types.wildcard(w),
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
