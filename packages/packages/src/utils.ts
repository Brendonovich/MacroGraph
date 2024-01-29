import {
  DataInput,
  ScopeOutput,
  Package,
  Core,
  DataOutput,
} from "@macrograph/runtime";
import {
  t,
  StructFields,
  Enum,
  EnumVariants,
  Struct,
} from "@macrograph/typesystem";
import { Maybe, Option, Some, None } from "@macrograph/option";
import { JSON, jsonToJS } from "@macrograph/json";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

dayjs.extend(duration);

export function pkg(core: Core) {
  const pkg = new Package({
    name: "Utils",
  });

  pkg.createNonEventSchema({
    name: "Print",
    variant: "Exec",
    createIO({ io }) {
      return io.dataInput({
        id: "input",
        name: "Input",
        type: t.string(),
      });
    },
    run({ ctx, io }) {
      core.print(ctx.getInput(io));
    },
  });

  pkg.createNonEventSchema({
    name: "String Includes",
    variant: "Pure",
    createIO({ io }) {
      return {
        haystack: io.dataInput({
          id: "haystack",
          name: "String",
          type: t.string(),
        }),
        needle: io.dataInput({
          id: "needle",
          name: "Includes",
          type: t.string(),
        }),
        out: io.dataOutput({
          id: "bool",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(
        io.out,
        ctx.getInput(io.haystack).includes(ctx.getInput(io.needle))
      );
    },
  });

  pkg.createNonEventSchema({
    name: "String Replace All",
    variant: "Pure",
    createIO({ io }) {
      return {
        input: io.dataInput({
          id: "input",
          name: "String",
          type: t.string(),
        }),
        find: io.dataInput({
          id: "find",
          name: "Find",
          type: t.string(),
        }),
        replace: io.dataInput({
          id: "replace",
          name: "Replace",
          type: t.string(),
        }),
        out: io.dataOutput({
          id: "out",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(
        io.out,
        ctx
          .getInput(io.input)
          .replaceAll(ctx.getInput(io.find), ctx.getInput(io.replace))
      );
    },
  });

  pkg.createNonEventSchema({
    name: "String Replace First",
    variant: "Pure",
    createIO({ io }) {
      return {
        input: io.dataInput({
          id: "input",
          name: "String",
          type: t.string(),
        }),
        find: io.dataInput({
          id: "find",
          name: "Find",
          type: t.string(),
        }),
        replace: io.dataInput({
          id: "replace",
          name: "Replace",
          type: t.string(),
        }),
        out: io.dataOutput({
          id: "out",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(
        io.out,
        ctx
          .getInput(io.input)
          .replace(ctx.getInput(io.find), ctx.getInput(io.replace))
      );
    },
  });

  pkg.createNonEventSchema({
    name: "String Length",
    variant: "Pure",
    createIO({ io }) {
      return {
        input: io.dataInput({
          id: "input",
          name: "String",
          type: t.string(),
        }),
        output: io.dataOutput({
          id: "int",
          type: t.int(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(io.output, ctx.getInput(io.input).length);
    },
  });

  pkg.createNonEventSchema({
    name: "String Starts With",
    variant: "Pure",
    createIO({ io }) {
      return {
        input: io.dataInput({
          id: "input",
          name: "String",
          type: t.string(),
        }),
        prefix: io.dataInput({
          id: "prefix",
          name: "Starts With",
          type: t.string(),
        }),
        out: io.dataOutput({
          id: "bool",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(
        io.out,
        ctx.getInput(io.input).startsWith(ctx.getInput(io.prefix))
      );
    },
  });

  pkg.createNonEventSchema({
    name: "Substring",
    variant: "Pure",
    createIO({ io }) {
      return {
        input: io.dataInput({
          id: "input",
          type: t.string(),
        }),
        start: io.dataInput({
          id: "start",
          name: "Start",
          type: t.int(),
        }),
        end: io.dataInput({
          id: "end",
          name: "End",
          type: t.int(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      const start = ctx.getInput(io.start);
      const end =
        ctx.getInput(io.end) !== 0
          ? ctx.getInput(io.end)
          : ctx.getInput(io.input).length;

      ctx.setOutput(io.output, ctx.getInput(io.input).substring(start, end));
    },
  });

  pkg.createNonEventSchema({
    name: "String To Uppercase",
    variant: "Pure",
    createIO({ io }) {
      return {
        input: io.dataInput({
          id: "input",
          type: t.string(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(io.output, ctx.getInput(io.input).toUpperCase());
    },
  });

  pkg.createNonEventSchema({
    name: "String To Lowercase",
    variant: "Pure",
    createIO({ io }) {
      return {
        input: io.dataInput({
          id: "input",
          type: t.string(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(io.output, ctx.getInput(io.input).toLowerCase());
    },
  });

  pkg.createNonEventSchema({
    name: "Reverse String",
    variant: "Pure",
    createIO({ io }) {
      return {
        input: io.dataInput({
          id: "input",
          type: t.string(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(io.output, [...ctx.getInput(io.input)].reverse().join(""));
    },
  });

  pkg.createNonEventSchema({
    name: "Int to String",
    variant: "Pure",
    createIO({ io }) {
      return {
        input: io.dataInput({
          id: "int",
          type: t.int(),
        }),
        output: io.dataOutput({
          id: "string",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(io.output, ctx.getInput(io.input).toString());
    },
  });

  pkg.createNonEventSchema({
    name: "Int to String (specify base)",
    variant: "Pure",
    createIO({ io }) {
      return {
        input: io.dataInput({
          id: "int",
          type: t.int(),
        }),
        base: io.dataInput({
          id: "base",
          name: "Base",
          type: t.int(),
        }),
        output: io.dataOutput({
          id: "string",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(
        io.output,
        ctx.getInput(io.input).toString(ctx.getInput(io.base))
      );
    },
  });

  pkg.createNonEventSchema({
    name: "Float to String",
    variant: "Pure",
    createIO({ io }) {
      return {
        float: io.dataInput({
          id: "float",
          type: t.float(),
        }),
        string: io.dataOutput({
          id: "string",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(io.string, ctx.getInput(io.float).toString());
    },
  });

  pkg.createNonEventSchema({
    name: "Bool to String",
    variant: "Pure",
    createIO({ io }) {
      return {
        bool: io.dataInput({
          id: "bool",
          type: t.bool(),
        }),
        string: io.dataOutput({
          id: "string",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(io.string, ctx.getInput(io.bool).toString());
    },
  });

  pkg.createNonEventSchema({
    name: "String to Int",
    variant: "Pure",
    createIO({ io }) {
      return {
        string: io.dataInput({
          id: "string",
          type: t.string(),
        }),
        int: io.dataOutput({
          id: "int",
          type: t.option(t.int()),
        }),
      };
    },
    run({ ctx, io }) {
      if (ctx.getInput(io.string) !== "") {
        const number = Number(ctx.getInput(io.string));
        const opt: Option<number> = Number.isNaN(number) ? None : Some(number);

        ctx.setOutput(io.int, opt.map(Math.floor));
      } else {
        ctx.setOutput(io.int, None);
      }
    },
  });

  pkg.createNonEventSchema({
    name: "String to int (specify base)",
    variant: "Pure",
    createIO({ io }) {
      return {
        string: io.dataInput({
          id: "string",
          type: t.string(),
        }),
        base: io.dataInput({
          id: "base",
          name: "Base",
          type: t.int(),
        }),
        int: io.dataOutput({
          id: "int",
          type: t.option(t.int()),
        }),
      };
    },
    run({ ctx, io }) {
      const number = parseInt(ctx.getInput(io.string), ctx.getInput(io.base));
      const opt: Option<number> = Number.isNaN(number) ? None : Some(number);

      ctx.setOutput(io.int, opt.map(Math.floor));
    },
  });

  pkg.createNonEventSchema({
    name: "String to Float",
    variant: "Pure",
    createIO({ io }) {
      return {
        string: io.dataInput({
          id: "string",
          type: t.string(),
        }),
        float: io.dataOutput({
          id: "float",
          type: t.option(t.float()),
        }),
      };
    },
    run({ ctx, io }) {
      const number = parseFloat(ctx.getInput(io.string));
      const opt: Option<number> = Number.isNaN(number) ? None : Some(number);

      ctx.setOutput(io.float, opt);
    },
  });

  pkg.createNonEventSchema({
    name: "Multiply Ints",
    variant: "Pure",
    createIO({ io }) {
      return {
        one: io.dataInput({
          id: "one",
          type: t.int(),
        }),
        two: io.dataInput({
          id: "two",
          type: t.int(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.int(),
        }),
      };
    },
    run({ ctx, io }) {
      const number = Math.floor(ctx.getInput(io.one) * ctx.getInput(io.two));
      ctx.setOutput(io.output, number);
    },
  });

  pkg.createNonEventSchema({
    name: "Multiply Floats",
    variant: "Pure",
    createIO({ io }) {
      return {
        one: io.dataInput({
          id: "one",
          type: t.float(),
        }),
        two: io.dataInput({
          id: "two",
          type: t.float(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.float(),
        }),
      };
    },
    run({ ctx, io }) {
      const number = ctx.getInput(io.one) * ctx.getInput(io.two);
      ctx.setOutput(io.output, number);
    },
  });

  pkg.createNonEventSchema({
    name: "Exponent Floats",
    variant: "Pure",
    createIO({ io }) {
      return {
        one: io.dataInput({
          id: "one",
          name: "Number",
          type: t.float(),
        }),
        two: io.dataInput({
          id: "two",
          name: "Exponent",
          type: t.float(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.float(),
        }),
      };
    },
    run({ ctx, io }) {
      const number = ctx.getInput(io.one) ** ctx.getInput(io.two);
      ctx.setOutput(io.output, number);
    },
  });

  pkg.createNonEventSchema({
    name: "Float to Int",
    variant: "Pure",
    createIO({ io }) {
      return {
        in: io.dataInput({
          id: "in",
          type: t.float(),
        }),
        out: io.dataOutput({
          id: "out",
          type: t.int(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(io.out, Math.round(ctx.getInput(io.in)));
    },
  });

  pkg.createNonEventSchema({
    name: "Int to Float",
    variant: "Pure",
    createIO({ io }) {
      return {
        in: io.dataInput({
          id: "in",
          type: t.int(),
        }),
        out: io.dataOutput({
          id: "out",
          type: t.float(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(io.out, ctx.getInput(io.in));
    },
  });

  pkg.createNonEventSchema({
    name: "Divide Ints Exact",
    variant: "Pure",
    createIO({ io }) {
      return {
        one: io.dataInput({
          id: "one",
          type: t.int(),
        }),
        two: io.dataInput({
          id: "two",
          type: t.int(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.float(),
        }),
      };
    },
    run({ ctx, io }) {
      const number = ctx.getInput(io.one) / ctx.getInput(io.two);
      ctx.setOutput(io.output, number);
    },
  });

  pkg.createNonEventSchema({
    name: "Divide Ints",
    variant: "Pure",
    createIO({ io }) {
      return {
        one: io.dataInput({
          id: "one",
          type: t.int(),
        }),
        two: io.dataInput({
          id: "two",
          type: t.int(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.int(),
        }),
      };
    },
    run({ ctx, io }) {
      const number = Math.floor(ctx.getInput(io.one) / ctx.getInput(io.two));
      ctx.setOutput(io.output, number);
    },
  });

  pkg.createNonEventSchema({
    name: "Divide Floats",
    variant: "Pure",
    createIO({ io }) {
      return {
        one: io.dataInput({
          id: "one",
          type: t.float(),
        }),
        two: io.dataInput({
          id: "two",
          type: t.float(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.float(),
        }),
      };
    },
    run({ ctx, io }) {
      const number = ctx.getInput(io.one) / ctx.getInput(io.two);
      ctx.setOutput(io.output, number);
    },
  });

  pkg.createNonEventSchema({
    name: "Min Floats",
    variant: "Pure",
    createIO({ io }) {
      return {
        one: io.dataInput({
          id: "one",
          type: t.float(),
        }),
        two: io.dataInput({
          id: "two",
          type: t.float(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.float(),
        }),
      };
    },
    run({ ctx, io }) {
      const number = Math.min(ctx.getInput(io.one), ctx.getInput(io.two));
      ctx.setOutput(io.output, number);
    },
  });

  pkg.createNonEventSchema({
    name: "Max Floats",
    variant: "Pure",
    createIO({ io }) {
      return {
        one: io.dataInput({
          id: "one",
          type: t.float(),
        }),
        two: io.dataInput({
          id: "two",
          type: t.float(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.float(),
        }),
      };
    },
    run({ ctx, io }) {
      const number = Math.max(ctx.getInput(io.one), ctx.getInput(io.two));
      ctx.setOutput(io.output, number);
    },
  });

  pkg.createNonEventSchema({
    name: "Max ints",
    variant: "Pure",
    createIO({ io }) {
      return {
        one: io.dataInput({
          id: "one",
          type: t.int(),
        }),
        two: io.dataInput({
          id: "two",
          type: t.int(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.int(),
        }),
      };
    },
    run({ ctx, io }) {
      const number = Math.max(ctx.getInput(io.one), ctx.getInput(io.two));
      ctx.setOutput(io.output, number);
    },
  });

  pkg.createNonEventSchema({
    name: "Min ints",
    variant: "Pure",
    createIO({ io }) {
      return {
        one: io.dataInput({
          id: "one",
          type: t.int(),
        }),
        two: io.dataInput({
          id: "two",
          type: t.int(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.int(),
        }),
      };
    },
    run({ ctx, io }) {
      const number = Math.min(ctx.getInput(io.one), ctx.getInput(io.two));
      ctx.setOutput(io.output, number);
    },
  });

  pkg.createNonEventSchema({
    name: "Sin",
    variant: "Pure",
    createIO({ io }) {
      return {
        one: io.dataInput({
          id: "one",
          type: t.float(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.float(),
        }),
      };
    },
    run({ ctx, io }) {
      const number = Math.sin(ctx.getInput(io.one));
      ctx.setOutput(io.output, number);
    },
  });

  pkg.createNonEventSchema({
    name: "Cos",
    variant: "Pure",
    createIO({ io }) {
      return {
        one: io.dataInput({
          id: "one",
          type: t.float(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.float(),
        }),
      };
    },
    run({ ctx, io }) {
      const number = Math.cos(ctx.getInput(io.one));
      ctx.setOutput(io.output, number);
    },
  });

  pkg.createNonEventSchema({
    name: "Tan",
    variant: "Pure",
    createIO({ io }) {
      return {
        one: io.dataInput({
          id: "one",
          type: t.float(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.float(),
        }),
      };
    },
    run({ ctx, io }) {
      const number = Math.tan(ctx.getInput(io.one));
      ctx.setOutput(io.output, number);
    },
  });

  pkg.createNonEventSchema({
    name: "Add Ints",
    variant: "Pure",
    createIO({ io }) {
      return {
        one: io.dataInput({
          id: "one",
          type: t.int(),
        }),
        two: io.dataInput({
          id: "two",
          type: t.int(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.int(),
        }),
      };
    },
    run({ ctx, io }) {
      const number = Math.floor(ctx.getInput(io.one) + ctx.getInput(io.two));
      ctx.setOutput(io.output, number);
    },
  });

  pkg.createNonEventSchema({
    name: "Add Floats",
    variant: "Pure",
    createIO({ io }) {
      return {
        one: io.dataInput({
          id: "one",
          type: t.float(),
        }),
        two: io.dataInput({
          id: "two",
          type: t.float(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.float(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(io.output, ctx.getInput(io.one) + ctx.getInput(io.two));
    },
  });

  pkg.createNonEventSchema({
    name: "Subtract Ints",
    variant: "Pure",
    createIO({ io }) {
      return {
        one: io.dataInput({
          id: "one",
          type: t.int(),
        }),
        two: io.dataInput({
          id: "two",
          type: t.int(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.int(),
        }),
      };
    },
    run({ ctx, io }) {
      const numb = Math.floor(ctx.getInput(io.one) - ctx.getInput(io.two));
      ctx.setOutput(io.output, numb);
    },
  });

  pkg.createNonEventSchema({
    name: "Subtract Floats",
    variant: "Pure",
    createIO({ io }) {
      return {
        one: io.dataInput({
          id: "one",
          type: t.float(),
        }),
        two: io.dataInput({
          id: "two",
          type: t.float(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.float(),
        }),
      };
    },
    run({ ctx, io }) {
      const numb = ctx.getInput(io.one) - ctx.getInput(io.two);
      ctx.setOutput(io.output, numb);
    },
  });

  pkg.createNonEventSchema({
    name: "Append String",
    variant: "Pure",
    createIO({ io }) {
      return {
        one: io.dataInput({
          id: "one",
          type: t.string(),
        }),
        two: io.dataInput({
          id: "two",
          type: t.string(),
        }),
        three: io.dataInput({
          id: "three",
          type: t.string(),
        }),
        four: io.dataInput({
          id: "four",
          type: t.string(),
        }),
        five: io.dataInput({
          id: "five",
          type: t.string(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(
        io.output,
        ctx.getInput(io.one) +
          ctx.getInput(io.two) +
          ctx.getInput(io.three) +
          ctx.getInput(io.four) +
          ctx.getInput(io.five)
      );
    },
  });

  pkg.createNonEventSchema({
    name: "Create String",
    variant: "Pure",
    createIO({ io }) {
      let inputs: DataInput<t.String>[];

      if (!io.previous) {
        const last = io.dataInput({
          id: "1",
          type: t.string(),
        });

        last.connection;

        inputs = [last];
      } else {
        inputs = [];

        const previousInputs = io.previous.inputs as DataInput<t.String>[];

        const endState: "twoUnconnected" | "fine" | "addOne" = (() => {
          const inputCount = previousInputs.length;
          const last = previousInputs[inputCount - 1]!;
          const secondLast = previousInputs[inputCount - 2];

          if (last.connection.isSome()) return "addOne";
          else if (
            !secondLast ||
            (last.connection.isNone() && secondLast.connection.isSome())
          )
            return "fine";
          else return "twoUnconnected";
        })();

        let lastConnectedIndex: Option<number> = None;

        for (let i = previousInputs.length - 1; i >= 0; i--) {
          const input = previousInputs[i]!;
          if (input.connection.isSome()) {
            lastConnectedIndex = Some(i);
            break;
          }
        }

        for (const input of previousInputs.slice(
          0,
          endState === "twoUnconnected"
            ? lastConnectedIndex.map((i) => i + 2).unwrapOr(1)
            : undefined
        )) {
          inputs.push(
            io.dataInput({
              id: input.id,
              type: t.string(),
            })
          );
        }

        if (endState === "addOne")
          inputs.push(
            io.dataInput({
              id: (previousInputs.length + 1).toString(),
              type: t.string(),
            })
          );

        inputs[io.inputs.length - 1]?.connection;
        inputs[io.inputs.length - 2]?.connection;
      }

      return {
        inputs,
        output: io.dataOutput({
          id: "output",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(
        io.output,
        io.inputs.reduce((acc, input) => {
          acc += ctx.getInput(input);
          return acc;
        }, "")
      );
    },
  });

  pkg.createNonEventSchema({
    name: "UUID",
    variant: "Exec",
    createIO({ io }) {
      return {
        output: io.dataOutput({
          id: "uuid",
          name: "UUID",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(io.output, crypto.randomUUID());
    },
  });

  pkg.createNonEventSchema({
    name: "Date Now (ms)",
    variant: "Pure",
    createIO({ io }) {
      return {
        time: io.dataOutput({
          id: "time",
          name: "Time (ms)",
          type: t.int(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(io.time, Date.now());
    },
  });

  pkg.createNonEventSchema({
    name: "Date Parse",
    variant: "Pure",
    createIO({ io }) {
      return {
        timeIn: io.dataInput({
          id: "timeIn",
          name: "Time",
          type: t.string(),
        }),
        timeOut: io.dataOutput({
          id: "timeOut",
          name: "Time (ms)",
          type: t.int(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(io.timeOut, Date.parse(ctx.getInput(io.timeIn)));
    },
  });

  pkg.createNonEventSchema({
    name: "Format Time",
    variant: "Pure",
    properties: {
      string: {
        name: "String",
        type: t.string(),
      },
    },
    createIO({ io }) {
      return {
        timeIn: io.dataInput({
          id: "timeIn",
          type: t.int(),
        }),
        timeOut: io.dataOutput({
          id: "timeOut",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io, properties }) {
      ctx.setOutput(
        io.timeOut,
        dayjs
          .duration(ctx.getInput(io.timeIn))
          .format(ctx.getProperty(properties.string))
      );
    },
  });

  pkg.createNonEventSchema({
    name: "Round Float",
    variant: "Pure",
    createIO({ io }) {
      return {
        input: io.dataInput({
          id: "input",
          type: t.float(),
        }),
        decimal: io.dataInput({
          id: "decimal",
          name: "Decimal Places",
          type: t.int(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.float(),
        }),
      };
    },
    run({ ctx, io }) {
      const input = ctx.getInput(io.input),
        decimal = ctx.getInput(io.decimal);

      ctx.setOutput(
        io.output,
        Math.round(input * Math.pow(10, decimal)) / Math.pow(10, decimal)
      );
    },
  });

  pkg.createNonEventSchema({
    name: "Remainder Float",
    variant: "Pure",
    createIO({ io }) {
      return {
        number: io.dataInput({
          id: "input",
          name: "Number",
          type: t.float(),
        }),
        divisor: io.dataInput({
          id: "divisor",
          name: "Divisor",
          type: t.float(),
        }),
        remainder: io.dataOutput({
          id: "remainder",
          name: "Remainder",
          type: t.float(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(
        io.remainder,
        ctx.getInput(io.number) % ctx.getInput(io.divisor)
      );
    },
  });

  pkg.createNonEventSchema({
    name: "Remainder Int",
    variant: "Pure",
    createIO({ io }) {
      return {
        number: io.dataInput({
          id: "input",
          name: "Number",
          type: t.int(),
        }),
        divisor: io.dataInput({
          id: "divisor",
          name: "Divisor",
          type: t.int(),
        }),
        remainder: io.dataOutput({
          id: "remainder",
          name: "Remainder",
          type: t.int(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(
        io.remainder,
        ctx.getInput(io.number) % ctx.getInput(io.divisor)
      );
    },
  });

  pkg.createNonEventSchema({
    name: "Random Float",
    variant: "Pure",
    createIO({ io }) {
      return io.dataOutput({
        id: "output",
        type: t.float(),
      });
    },
    run({ ctx, io }) {
      ctx.setOutput(io, Math.random());
    },
  });

  pkg.createNonEventSchema({
    name: "Random Float In Range",
    variant: "Pure",
    createIO({ io }) {
      return {
        min: io.dataInput({
          id: "min",
          name: "Min",
          type: t.float(),
        }),
        max: io.dataInput({
          id: "max",
          name: "Max",
          type: t.float(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.float(),
        }),
      };
    },
    run({ ctx, io }) {
      const min = ctx.getInput(io.min),
        max = ctx.getInput(io.max);

      ctx.setOutput(io.output, Math.random() * (max - min) + min);
    },
  });

  pkg.createNonEventSchema({
    name: "Random Integer",
    variant: "Pure",
    createIO({ io }) {
      return io.dataOutput({
        id: "output",
        type: t.int(),
      });
    },

    run({ ctx, io }) {
      // 0.5 triggers round up so distribution is even
      ctx.setOutput(io, Math.round(Math.random()));
    },
  });

  pkg.createNonEventSchema({
    name: "Random Integer In Range",
    variant: "Pure",
    createIO({ io }) {
      return {
        min: io.dataInput({
          id: "min",
          name: "Min",
          type: t.int(),
        }),
        max: io.dataInput({
          id: "max",
          name: "Max",
          type: t.int(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.int(),
        }),
      };
    },
    run({ ctx, io }) {
      const min = ctx.getInput(io.min),
        max = ctx.getInput(io.max);

      // Use Math.floor to ensure even distribution
      ctx.setOutput(
        io.output,
        Math.floor(Math.random() * (max + 1 - min) + min)
      );
    },
  });

  pkg.createNonEventSchema({
    name: "Compare Int",
    variant: "Pure",
    createIO({ io }) {
      return {
        input: io.dataInput({
          id: "number",
          name: "Number",
          type: t.int(),
        }),
        compare: io.dataInput({
          id: "compare",
          name: "Compare against",
          type: t.int(),
        }),
        equal: io.dataOutput({
          id: "outputE",
          name: "Equal",
          type: t.bool(),
        }),
        greater: io.dataOutput({
          id: "outputG",
          name: "Greater",
          type: t.bool(),
        }),
        less: io.dataOutput({
          id: "outputL",
          name: "Less",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, io }) {
      const input = ctx.getInput(io.input),
        compare = ctx.getInput(io.compare);

      ctx.setOutput(io.equal, input === compare);
      ctx.setOutput(io.greater, input > compare);
      ctx.setOutput(io.less, input < compare);
    },
  });

  pkg.createNonEventSchema({
    name: "Make Any",
    variant: "Pure",
    createIO({ io }) {
      const w = io.wildcard("");

      return {
        input: io.dataInput({
          id: "input",
          type: t.wildcard(w),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.wildcard(w),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(io.output, ctx.getInput(io.input));
    },
  });

  pkg.createNonEventSchema({
    name: "Make String",
    variant: "Pure",
    createIO({ io }) {
      return {
        input: io.dataInput({
          id: "input",
          type: t.string(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(io.output, ctx.getInput(io.input));
    },
  });

  pkg.createNonEventSchema({
    name: "Make Int",
    variant: "Pure",
    createIO({ io }) {
      return {
        input: io.dataInput({
          id: "input",
          type: t.int(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.int(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(io.output, ctx.getInput(io.input));
    },
  });

  pkg.createNonEventSchema({
    name: "Make Float",
    variant: "Pure",
    createIO({ io }) {
      return {
        input: io.dataInput({
          id: "input",
          type: t.float(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.float(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(io.output, ctx.getInput(io.input));
    },
  });

  pkg.createNonEventSchema({
    name: "Equal",
    variant: "Pure",
    createIO({ io }) {
      const w = io.wildcard("");

      return {
        one: io.dataInput({
          id: "one",
          type: t.wildcard(w),
        }),
        two: io.dataInput({
          id: "two",
          type: t.wildcard(w),
        }),
        equal: io.dataOutput({
          id: "equal",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(io.equal, ctx.getInput(io.one) === ctx.getInput(io.two));
    },
  });

  pkg.createNonEventSchema({
    name: "List Includes",
    variant: "Pure",
    createIO({ io }) {
      const w = io.wildcard("");

      return {
        input: io.dataInput({
          id: "input",
          type: t.wildcard(w),
        }),
        list: io.dataInput({
          id: "list",
          type: t.list(t.wildcard(w)),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(
        io.output,
        ctx.getInput(io.list).includes(ctx.getInput(io.input))
      );
    },
  });

  pkg.createNonEventSchema({
    name: "List Length",
    variant: "Pure",
    createIO({ io }) {
      return {
        list: io.dataInput({
          id: "list",
          type: t.list(t.wildcard(io.wildcard(""))),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.int(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(io.output, ctx.getInput(io.list).length);
    },
  });

  pkg.createNonEventSchema({
    name: "Split String",
    variant: "Pure",
    createIO({ io }) {
      return {
        input: io.dataInput({
          id: "input",
          name: "String",
          type: t.string(),
        }),
        separator: io.dataInput({
          id: "separator",
          name: "Separator",
          type: t.string(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.list(t.string()),
        }),
      };
    },
    run({ ctx, io }) {
      const array = ctx.getInput(io.input).split(ctx.getInput(io.separator));
      ctx.setOutput(io.output, array);
    },
  });

  pkg.createNonEventSchema({
    name: "Nth Word",
    variant: "Pure",
    createIO({ io }) {
      return {
        input: io.dataInput({
          id: "input",
          type: t.string(),
        }),
        index: io.dataInput({
          id: "index",
          name: "N",
          type: t.int(),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.option(t.string()),
        }),
      };
    },
    run({ ctx, io }) {
      const word = Maybe(
        ctx.getInput(io.input).trim().split(WORD_REGEX)[ctx.getInput(io.index)]
      );

      ctx.setOutput(io.output, word);
    },
  });

  pkg.createNonEventSchema({
    name: `Unwrap Option`,
    variant: "Pure",
    createIO({ io }) {
      const w = io.wildcard("");

      return {
        input: io.dataInput({
          id: "input",
          type: t.option(t.wildcard(w)),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.wildcard(w),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(io.output, ctx.getInput(io.input).unwrap());
    },
  });

  pkg.createNonEventSchema({
    name: `Unwrap Option Or`,
    variant: "Pure",
    createIO({ io }) {
      const w = io.wildcard("");

      return {
        input: io.dataInput({
          id: "input",
          type: t.option(t.wildcard(w)),
        }),
        or: io.dataInput({
          id: "or",
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
        ctx.getInput(io.input).unwrapOr(ctx.getInput(io.or))
      );
    },
  });

  pkg.createNonEventSchema({
    name: `Is Option Some`,
    variant: "Pure",
    createIO({ io }) {
      const w = io.wildcard("");

      return {
        input: io.dataInput({
          id: "input",
          type: t.option(t.wildcard(w)),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(io.output, ctx.getInput(io.input).isSome());
    },
  });

  pkg.createNonEventSchema({
    name: `Is Option None`,
    variant: "Pure",
    createIO({ io }) {
      const w = io.wildcard("");

      return {
        input: io.dataInput({
          id: "input",
          type: t.option(t.wildcard(w)),
        }),
        output: io.dataOutput({
          id: "output",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(io.output, ctx.getInput(io.input).isNone());
    },
  });

  pkg.createNonEventSchema({
    name: `Make Some`,
    variant: "Pure",
    createIO({ io }) {
      const type = io.wildcard("");

      return {
        in: io.dataInput({
          id: "in",
          type: t.wildcard(type),
        }),
        out: io.dataOutput({
          id: "out",
          type: t.option(t.wildcard(type)),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(io.out, Some(ctx.getInput(io.in)));
    },
  });

  pkg.createNonEventSchema({
    name: "Break Struct",
    variant: "Pure",
    createIO({ io }) {
      const w = io.wildcard("");

      const input = io.dataInput({
        id: "",
        type: t.wildcard(w),
      });

      const outputs = w.value().map((wt) => {
        if (!(wt instanceof t.Struct)) return null;

        const dataOutputs = Object.entries(
          wt.struct.fields as StructFields
        ).map(([id, field]) =>
          io.dataOutput({
            id,
            name: field.name,
            type: field.type,
          })
        );

        return {
          wildcard: wt,
          input: input as unknown as DataInput<t.Struct<any>>,
          outputs: dataOutputs,
        };
      });

      return outputs;
    },
    run({ ctx, io }) {
      io.map((io) => {
        const data = ctx.getInput(io.input);

        io.outputs.forEach((output) => {
          ctx.setOutput(output, data[output.id]);
        });
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Create Struct",
    variant: "Pure",
    createIO({ io }) {
      const w = io.wildcard("");

      const output = io.dataOutput({
        id: "",
        type: t.wildcard(w),
      });

      const inputs = w.value().map((wt) => {
        if (!(wt instanceof t.Struct)) return null;

        const dataOutputs = Object.entries(
          wt.struct.fields as StructFields
        ).map(([id, field]) =>
          io.dataInput({
            id,
            name: field.name,
            type: field.type,
          })
        );

        return {
          wildcard: wt,
          output: output as unknown as DataOutput<t.Struct<Struct>>,
          inputs: dataOutputs,
        };
      });

      return inputs;
    },
    run({ ctx, io }) {
      io.map((io) => {
        const data = io.inputs.reduce((acc, input) => {
          acc[input.id] = ctx.getInput(input);
        }, {} as any);

        let struct = io.output.type.struct.create(data);

        ctx.setOutput(io.output, struct);
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Match",
    variant: "Base",
    createIO({ io }) {
      const w = io.wildcard("");

      io.execInput({
        id: "exec",
      });

      const data = io.dataInput({
        id: "data",
        type: t.wildcard(w),
      });

      const outputs = w.value().map((v) => {
        if (v instanceof t.Enum) {
          const variantOutputs = (
            v as t.Enum<Enum<EnumVariants>>
          ).inner.variants.map((v) => {
            const { name, data } = v;

            if (data === null) {
              return io.execOutput({
                id: name,
                name: name,
              });
            } else {
              return io.scopeOutput({
                id: name,
                name: v.name,
                scope: (s) => {
                  Object.entries(data).forEach(([id, type]) => {
                    s.output({
                      id,
                      type,
                    });
                  });
                },
              });
            }
          });

          return {
            type: "enum" as const,
            input: data as unknown as DataInput<t.Enum<Enum<EnumVariants>>>,
            outputs: variantOutputs,
          };
        } else if (v instanceof t.Option) {
          return {
            type: "option" as const,
            input: data as unknown as DataInput<t.Option<t.Any>>,
            outputs: {
              none: io.execOutput({
                id: "none",
                name: "None",
              }),
              some: io.scopeOutput({
                id: "some",
                name: "Some",
                scope: (s) => {
                  s.output({
                    id: "value",
                    type: v.inner,
                  });
                },
              }),
            },
          };
        }
      });

      return {
        data,
        outputs,
      };
    },
    run({ ctx, io }) {
      io.outputs.peek((v) => {
        if (!v) return;

        if (v.type === "enum") {
          const data = ctx.getInput(v.input);

          const output = v.outputs.find((o) => o.id === data.variant)!;

          if (output instanceof ScopeOutput) {
            if ("data" in data) return ctx.execScope(output, data.data);
          } else return ctx.exec(output);
        } else if (v.type === "option") {
          const data = ctx.getInput(v.input);

          return data.mapOrElse(
            () => ctx.exec(v.outputs.none),
            (value) => {
              return ctx.execScope(v.outputs.some, { value });
            }
          );
        }
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Break Scope",
    variant: "Base",
    createIO({ io }) {
      const input = io.scopeInput({
        id: "",
      });

      const outputs = input.scope().map((scope) => {
        const exec = io.execOutput({
          id: "",
        });

        const outputs = scope.outputs.map((out) => io.dataOutput(out));

        return { exec, outputs };
      });

      return {
        input,
        outputs,
      };
    },
    async run({ ctx, io }) {
      const data = ctx.getInput(io.input);

      await io.outputs.mapAsync((s) => {
        s.outputs.forEach((o) => ctx.setOutput(o, data[o.id]));

        return ctx.exec(s.exec);
      });
    },
  });

  pkg.createEventSchema({
    event: "MGLoaded",
    name: "Macrograph Started",
    createIO({ io }) {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
      };
    },
    run({ ctx, data, io }) {
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    event: "custom",
    name: "Custom Event",
    createIO({ io }) {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        inName: io.dataInput({
          id: "inName",
          name: "Event Name",
          type: t.string(),
        }),
        outName: io.dataOutput({
          id: "outName",
          name: "Event Name",
          type: t.string(),
        }),
        string: io.dataOutput({
          id: "eventKey",
          name: "String Data",
          type: t.string(),
        }),
        int: io.dataOutput({
          id: "int",
          name: "Int Data",
          type: t.int(),
        }),
        float: io.dataOutput({
          id: "float",
          name: "Float Data",
          type: t.float(),
        }),
        data: io.dataOutput({
          id: "eventData",
          name: "JSON Data",
          type: t.enum(JSON),
        }),
      };
    },
    run({ ctx, data, io }) {
      if (!ctx.getInput(io.inName)) return;
      if (ctx.getInput(io.inName) !== data.name) return;
      ctx.setOutput(io.outName, data.name);
      ctx.setOutput(io.string, data.string);
      ctx.setOutput(io.int, data.int);
      ctx.setOutput(io.float, data.float);
      ctx.setOutput(io.data, data.data);
      ctx.exec(io.exec);
    },
  });

  pkg.createEventSchema({
    event: "customReturn",
    name: "Custom Event Return",
    createIO({ io }) {
      return {
        exec: io.execOutput({
          id: "exec",
          name: "",
        }),
        inName: io.dataInput({
          id: "inName",
          name: "Event Name",
          type: t.string(),
        }),
        outName: io.dataOutput({
          id: "outName",
          name: "Event Name",
          type: t.string(),
        }),
        string: io.dataOutput({
          id: "eventKey",
          name: "String Data",
          type: t.string(),
        }),
        int: io.dataOutput({
          id: "int",
          name: "Int Data",
          type: t.int(),
        }),
        float: io.dataOutput({
          id: "float",
          name: "Float Data",
          type: t.float(),
        }),
        data: io.dataOutput({
          id: "eventData",
          name: "JSON Data",
          type: t.enum(JSON),
        }),
      };
    },
    run({ ctx, data, io }) {
      if (!ctx.getInput(io.inName)) return;
      if (ctx.getInput(io.inName) !== data.name) return;
      ctx.setOutput(io.outName, data.name);
      ctx.setOutput(io.string, data.string);
      ctx.setOutput(io.int, data.int);
      ctx.setOutput(io.float, data.float);
      ctx.setOutput(io.data, data.data);
      ctx.exec(io.exec);
    },
  });

  pkg.createNonEventSchema({
    name: "Emit Custom Event",
    variant: "Exec",
    createIO({ io }) {
      return {
        event: io.dataInput({
          id: "event",
          name: "Event Name",
          type: t.string(),
        }),
        string: io.dataInput({
          id: "string",
          name: "String Data",
          type: t.string(),
        }),
        int: io.dataInput({
          id: "int",
          name: "Int Data",
          type: t.int(),
        }),
        float: io.dataInput({
          id: "float",
          name: "Float Data",
          type: t.float(),
        }),
        data: io.dataInput({
          id: "eventData",
          name: "JSON Data",
          type: t.enum(JSON),
        }),
      };
    },
    run({ ctx, io }) {
      pkg.emitEvent({
        name: "custom",
        data: {
          name: ctx.getInput(io.event),
          data: ctx.getInput(io.data),
          string: ctx.getInput(io.string),
          int: ctx.getInput(io.int),
          float: ctx.getInput(io.float),
        },
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Emit Custom Return Event",
    variant: "Exec",
    createIO({ io }) {
      return {
        event: io.dataInput({
          id: "event",
          name: "Event Name",
          type: t.string(),
        }),
        string: io.dataInput({
          id: "string",
          name: "String Data",
          type: t.string(),
        }),
        int: io.dataInput({
          id: "int",
          name: "Int Data",
          type: t.int(),
        }),
        float: io.dataInput({
          id: "float",
          name: "Float Data",
          type: t.float(),
        }),
        data: io.dataInput({
          id: "eventData",
          name: "JSON Data",
          type: t.enum(JSON),
        }),
      };
    },
    run({ ctx, io }) {
      pkg.emitEvent({
        name: "customReturn",
        data: {
          name: ctx.getInput(io.event),
          data: ctx.getInput(io.data),
          string: ctx.getInput(io.string),
          int: ctx.getInput(io.int),
          float: ctx.getInput(io.float),
        },
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Stringify JSON",
    variant: "Pure",
    createIO({ io }) {
      return {
        in: io.dataInput({
          id: "in",
          name: "Json",
          type: t.enum(JSON),
        }),
        out: io.dataOutput({
          id: "string",
          name: "String",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(
        io.out,
        window.JSON.stringify(jsonToJS(ctx.getInput(io.in)))
      );
    },
  });

  pkg.createNonEventSchema({
    name: "Cache",
    variant: "Exec",
    createIO({ io }) {
      const w = io.wildcard("");

      return {
        in: io.dataInput({
          id: "",
          type: t.wildcard(w),
        }),
        out: io.dataOutput({
          id: "",
          type: t.wildcard(w),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(io.out, ctx.getInput(io.in));
    },
  });

  pkg.createNonEventSchema({
    name: "Copy",
    variant: "Exec",
    createIO({ io }) {
      const w = io.wildcard("");

      return {
        in: io.dataInput({
          id: "",
          type: t.wildcard(w),
        }),
        out: io.dataOutput({
          id: "",
          type: t.wildcard(w),
        }),
      };
    },
    run({ ctx, io }) {
      let data = ctx.getInput(io.in);

      if (Array.isArray(data)) {
        ctx.setOutput(io.out, [...data]);
      } else if (data instanceof Map) {
        ctx.setOutput(io.out, new Map(data));
      } else {
        ctx.setOutput(io.out, ctx.getInput(io.in));
      }
    },
  });

  pkg.createNonEventSchema({
    name: "Current Timestamp (ms)",
    variant: "Exec",
    createIO({ io }) {
      return {
        out: io.dataOutput({
          id: "out",
          name: "Timestamp",
          type: t.int(),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(io.out, Date.now());
    },
  });

  pkg.createNonEventSchema({
    name: "Format String",
    variant: "Pure",
    properties: {
      string: {
        name: "String",
        type: t.string(),
      },
    },
    createIO({ io, ctx, properties }) {
      const value = ctx.getProperty(properties.string) ?? "";
      const blocks = parseFormatString(value);

      return {
        blocks: blocks.map((block) => {
          if ("variable" in block) {
            return io.dataInput({
              id: block.variable,
              name: block.variable,
              type: t.string(),
            });
          } else return block.text;
        }),
        output: io.dataOutput({
          id: "",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      const out = io.blocks.reduce<string>((acc, input) => {
        if (typeof input === "string") acc += input;
        else acc += ctx.getInput(input);

        return acc;
      }, "");

      ctx.setOutput(io.output, out);
    },
  });

  setTimeout(() => {
    pkg.emitEvent({ name: "MGLoaded", data: {} });
  }, 1);

  return pkg;
}

const WORD_REGEX = /\s+/;

export function parseFormatString(input: string) {
  const chars = input.split("");

  const blocks: Array<{ text: string } | { variable: string }> = [];

  let buffer = "";
  let isInVariable = false;

  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];

    if (char === "{") {
      if (chars[i + 1] === "{") {
        buffer += "{";
        i++;
        continue;
      }

      if (buffer !== "") blocks.push({ text: buffer });

      buffer = "";
      isInVariable = true;
    } else if (chars[i] === "}") {
      if (isInVariable) {
        blocks.push({ variable: buffer });
      } else {
        if (chars[i + 1] === "}") {
          buffer += "}";
          i++;
          continue;
        }

        blocks.push({ text: buffer });
      }

      isInVariable = false;
      buffer = "";
    } else buffer += chars[i];
  }

  if (buffer !== "") blocks.push({ text: buffer });

  return blocks;
}
