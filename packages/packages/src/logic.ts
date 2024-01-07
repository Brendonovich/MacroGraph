import { Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";

export function pkg() {
  const pkg = new Package({
    name: "Logic",
  });

  pkg.createNonEventSchema({
    name: "Branch",
    variant: "Base",
    generateIO({ io }) {
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
    generateIO({ io }) {
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
    generateIO({ io }) {
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
    generateIO({ io }) {
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
    generateIO({ io }) {
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
    generateIO({ io }) {
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
    generateIO({ io }) {
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
    generateIO({ io }) {
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
    generateIO({ io }) {
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
    generateIO({ io }) {
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

  pkg.createNonEventSchema({
    name: `Switch`,
    variant: "Base",
    properties: {
      number: {
        name: "Keys",
        type: t.int(),
        default: 1,
      },
    },
    generateIO({ io, ctx, properties }) {
      const value = ctx.getProperty(properties.number);
      const w = io.wildcard("");

      return {
        exec: io.execInput({
          id: "exec",
        }),
        default: io.execOutput({
          id: "exec",
          name: "Default",
        }),
        switchOn: io.dataInput({
          id: "switchOn",
          type: t.wildcard(w),
          name: "Data In",
        }),
        switchOut: io.dataOutput({
          id: "switchOut",
          type: t.wildcard(w),
          name: "Data Out",
        }),
        pins: Array.from({ length: value }, (v, i) => ({
          case: io.dataInput({
            id: `key-${i}`,
            type: t.wildcard(w),
          }),
          exec: io.execOutput({
            id: `key-${i}`,
          }),
        })),
      };
    },
    async run({ ctx, io }) {
      const switchData = ctx.getInput(io.switchOn);
      ctx.setOutput(io.switchOut, ctx.getInput(io.switchOn));
      const input = io.pins.find(
        (input) => ctx.getInput(input.case) === switchData
      );
      await ctx.exec(input === undefined ? io.default : input.exec);
    },
  });

  return pkg;
}
