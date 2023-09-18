import { createPackage, t } from "@macrograph/core";

export const pkg = createPackage({
  name: "Logic",
});

pkg.createNonEventSchema({
  name: "Branch",
  variant: "Base",
  generateIO(io) {
    io.execInput({
      id: "exec",
    });

    return {
      condition: io.dataInput({
        id: "condition",
        name: "Condition",
        type: t.bool(),
      }),
      true: io.execOutput({
        id: "true",
        name: "True",
      }),
      false: io.execOutput({
        id: "false",
        name: "False",
      }),
    };
  },
  run({ ctx, io }) {
    ctx.exec(ctx.getInput(io.condition) ? io.true : io.false);
  },
});

pkg.createNonEventSchema({
  name: "Wait",
  variant: "Exec",
  generateIO(io) {
    return io.dataInput({
      id: "delay",
      name: "Wait in ms",
      type: t.int(),
    });
  },
  run({ ctx, io }) {
    return new Promise((res) => setTimeout(res, ctx.getInput(io)));
  },
});

pkg.createNonEventSchema({
  name: "AND",
  variant: "Pure",
  generateIO(io) {
    return {
      one: io.dataInput({
        id: "one",
        type: t.bool(),
      }),
      two: io.dataInput({
        id: "two",
        type: t.bool(),
      }),
      value: io.dataOutput({
        id: "value",
        type: t.bool(),
      }),
    };
  },
  run({ ctx, io }) {
    ctx.setOutput(io.value, ctx.getInput(io.one) && ctx.getInput(io.two));
  },
});

pkg.createNonEventSchema({
  name: "NAND",
  variant: "Pure",
  generateIO(io) {
    return {
      one: io.dataInput({
        id: "one",
        type: t.bool(),
      }),
      two: io.dataInput({
        id: "two",
        type: t.bool(),
      }),
      value: io.dataOutput({
        id: "value",
        type: t.bool(),
      }),
    };
  },
  run({ ctx, io }) {
    ctx.setOutput(io.value, !(ctx.getInput(io.one) && ctx.getInput(io.two)));
  },
});

pkg.createNonEventSchema({
  name: "OR",
  variant: "Pure",
  generateIO(io) {
    return {
      one: io.dataInput({
        id: "one",
        type: t.bool(),
      }),
      two: io.dataInput({
        id: "two",
        type: t.bool(),
      }),
      value: io.dataOutput({
        id: "value",
        type: t.bool(),
      }),
    };
  },
  run({ ctx, io }) {
    ctx.setOutput(io.value, ctx.getInput(io.one) || ctx.getInput(io.two));
  },
});

pkg.createNonEventSchema({
  name: "NOR",
  variant: "Pure",
  generateIO(io) {
    return {
      one: io.dataInput({
        id: "one",
        type: t.bool(),
      }),
      two: io.dataInput({
        id: "two",
        type: t.bool(),
      }),
      value: io.dataOutput({
        id: "value",
        type: t.bool(),
      }),
    };
  },
  run({ ctx, io }) {
    ctx.setOutput(io.value, !(ctx.getInput(io.one) || ctx.getInput(io.two)));
  },
});

pkg.createNonEventSchema({
  name: "XOR",
  variant: "Pure",
  generateIO(io) {
    return {
      one: io.dataInput({
        id: "one",
        type: t.bool(),
      }),
      two: io.dataInput({
        id: "two",
        type: t.bool(),
      }),
      value: io.dataOutput({
        id: "value",
        type: t.bool(),
      }),
    };
  },
  run({ ctx, io }) {
    ctx.setOutput(io.value, ctx.getInput(io.one) != ctx.getInput(io.two));
  },
});

pkg.createNonEventSchema({
  name: "NOT",
  variant: "Pure",
  generateIO(io) {
    return {
      input: io.dataInput({
        id: "input",
        type: t.bool(),
      }),
      output: io.dataOutput({
        id: "output",
        type: t.bool(),
      }),
    };
  },
  run({ ctx, io }) {
    ctx.setOutput(io.output, !ctx.getInput(io.input));
  },
});

pkg.createNonEventSchema({
  name: `Conditional`,
  variant: "Pure",
  generateIO(io) {
    const w = io.wildcard("");

    return {
      condition: io.dataInput({
        id: "condition",
        name: "Condition",
        type: t.bool(),
      }),
      true: io.dataInput({
        id: "trueValue",
        name: "True",
        type: t.wildcard(w),
      }),
      false: io.dataInput({
        id: "falseValue",
        name: "False",
        type: t.wildcard(w),
      }),
      output: io.dataOutput({
        id: "output",
        type: t.wildcard(w),
      }),
    };
  },
  run({ ctx, io }) {
    ctx.setOutput(
      io.output,
      ctx.getInput(io.condition)
        ? ctx.getInput(io.true)
        : ctx.getInput(io.false)
    );
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
