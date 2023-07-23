import { core, t } from "@macrograph/core";

const pkg = core.createPackage({
  name: "Logic",
});

pkg.createNonEventSchema({
  name: "Branch",
  variant: "Base",
  run({ ctx }) {
    ctx.exec(ctx.getInput<boolean>("condition") ? "true" : "false");
  },
  generateIO(io) {
    io.execInput({
      id: "exec",
    });
    io.dataInput({
      id: "condition",
      name: "Condition",
      type: t.bool(),
    });

    io.execOutput({
      id: "true",
      name: "True",
    });
    io.execOutput({
      id: "false",
      name: "False",
    });
  },
});

pkg.createNonEventSchema({
  name: "Wait",
  variant: "Exec",
  run({ ctx }) {
    return new Promise((res) => setTimeout(res, ctx.getInput("delay")));
  },
  generateIO(io) {
    io.dataInput({
      id: "delay",
      name: "Wait in ms",
      type: t.int(),
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
  generateIO(io) {
    io.dataInput({
      id: "one",
      type: t.bool(),
    });
    io.dataInput({
      id: "two",
      type: t.bool(),
    });
    io.dataOutput({
      id: "value",
      type: t.bool(),
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
  generateIO(io) {
    io.dataInput({
      id: "one",
      type: t.bool(),
    });
    io.dataInput({
      id: "two",
      type: t.bool(),
    });
    io.dataOutput({
      id: "value",
      type: t.bool(),
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
  generateIO(io) {
    io.dataInput({
      id: "one",
      type: t.bool(),
    });
    io.dataInput({
      id: "two",
      type: t.bool(),
    });
    io.dataOutput({
      id: "value",
      type: t.bool(),
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
  generateIO(io) {
    io.dataInput({
      id: "one",
      type: t.bool(),
    });
    io.dataInput({
      id: "two",
      type: t.bool(),
    });
    io.dataOutput({
      id: "value",
      type: t.bool(),
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
  generateIO(io) {
    io.dataInput({
      id: "one",
      type: t.bool(),
    });
    io.dataInput({
      id: "two",
      type: t.bool(),
    });
    io.dataOutput({
      id: "value",
      type: t.bool(),
    });
  },
});

pkg.createNonEventSchema({
  name: "NOT",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput("output", !ctx.getInput<boolean>("input"));
  },
  generateIO(io) {
    io.dataInput({
      id: "input",
      type: t.bool(),
    });
    io.dataOutput({
      id: "output",
      type: t.bool(),
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
    const w = io.wildcard("");

    io.dataInput({
      id: "condition",
      name: "Condition",
      type: t.bool(),
    });
    io.dataInput({
      id: "trueValue",
      name: "True",
      type: t.wildcard(w),
    });
    io.dataInput({
      id: "falseValue",
      name: "False",
      type: t.wildcard(w),
    });
    io.dataOutput({
      id: "output",
      type: t.wildcard(w),
    });
  },
});

pkg.createNonEventSchema({
  name: `For Each`,
  variant: "Base",
  generateIO(io) {
    const w = io.wildcard("");

    return {
      exec: io.execInput({
        id: "exec",
      }),
      array: io.dataInput({
        id: "array",
        name: "Array",
        type: t.list(t.wildcard(w)),
      }),
      body: io.scopeOutput({
        id: "body",
        name: "Loop Body",
        scope: (s) => {
          s.output({
            id: "element",
            name: "Array Element",
            type: t.wildcard(w),
          });
          s.output({
            id: "index",
            name: "Array Index",
            type: t.int(),
          });
        },
      }),
      completed: io.execOutput({
        id: "completed",
        name: "Completed",
      }),
    };
  },
  async run({ ctx, io }) {
    for (const [index, element] of ctx.getInput(io.array).entries()) {
      await ctx.execScope(io.body, { element, index });
    }

    await ctx.exec(io.completed);
  },
});
