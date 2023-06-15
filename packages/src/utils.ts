import {
  core,
  Maybe,
  Option,
  Some,
  t,
  StructFields,
  Enum,
  InferEnum,
} from "@macrograph/core";

const pkg = core.createPackage({
  name: "Utils",
});

class PrintChannel {
  listeners = [] as ((d: string) => any)[];

  emit(data: string) {
    this.listeners.forEach((l) => l(data));
  }

  subscribe(cb: (d: string) => any) {
    this.listeners.push(cb);

    return () =>
      this.listeners.splice(
        this.listeners.findIndex((l) => l === cb),
        1
      );
  }
}

export const PRINT_CHANNEL = new PrintChannel();

pkg.createNonEventSchema({
  name: "Print",
  variant: "Exec",
  run({ ctx }) {
    PRINT_CHANNEL.emit(ctx.getInput<string>("input"));
  },
  generateIO(io) {
    io.dataInput({
      id: "input",
      name: "Input",
      type: t.string(),
    });
  },
});

pkg.createNonEventSchema({
  name: "String Includes",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput(
      "bool",
      ctx.getInput<string>("haystack").includes(ctx.getInput<string>("needle"))
    );
  },
  generateIO(io) {
    io.dataInput({
      id: "haystack",
      name: "String",
      type: t.string(),
    });
    io.dataInput({
      id: "needle",
      name: "Includes",
      type: t.string(),
    });
    io.dataOutput({
      id: "bool",
      type: t.bool(),
    });
  },
});

pkg.createNonEventSchema({
  name: "String Length",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput("int", ctx.getInput<string>("input").length);
  },
  generateIO(io) {
    io.dataInput({
      id: "input",
      name: "String",
      type: t.string(),
    });
    io.dataOutput({
      id: "int",
      type: t.int(),
    });
  },
});

pkg.createNonEventSchema({
  name: "String Starts With",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput(
      "bool",
      ctx.getInput<string>("input").startsWith(ctx.getInput<string>("prefix"))
    );
  },
  generateIO(io) {
    io.dataInput({
      id: "input",
      name: "String",
      type: t.string(),
    });
    io.dataInput({
      id: "prefix",
      name: "Starts With",
      type: t.string(),
    });
    io.dataOutput({
      id: "bool",
      type: t.bool(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Substring",
  variant: "Pure",
  run({ ctx }) {
    const start = ctx.getInput<number>("start")
      ? ctx.getInput<number>("start")
      : 0;
    const end =
      ctx.getInput<number>("end") !== 0
        ? ctx.getInput<number>("end")
        : ctx.getInput<string>("input").length;
    ctx.setOutput(
      "output",
      ctx.getInput<string>("input").substring(start, end)
    );
  },
  generateIO(io) {
    io.dataInput({
      id: "input",
      type: t.string(),
    });
    io.dataInput({
      id: "start",
      name: "Start",
      type: t.int(),
    });
    io.dataInput({
      id: "end",
      name: "End",
      type: t.int(),
    });
    io.dataOutput({
      id: "output",
      type: t.string(),
    });
  },
});

pkg.createNonEventSchema({
  name: "String To Uppercase",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput("output", ctx.getInput<string>("input").toUpperCase());
  },
  generateIO(io) {
    io.dataInput({
      id: "input",
      type: t.string(),
    });
    io.dataOutput({
      id: "output",
      type: t.string(),
    });
  },
});

pkg.createNonEventSchema({
  name: "String To Lowercase",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput("output", ctx.getInput<string>("input").toLowerCase());
  },
  generateIO(io) {
    io.dataInput({
      id: "input",
      type: t.string(),
    });
    io.dataOutput({
      id: "output",
      type: t.string(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Int to String",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput("string", ctx.getInput<number>("int").toString());
  },
  generateIO(io) {
    io.dataInput({
      id: "int",
      type: t.int(),
    });
    io.dataOutput({
      id: "string",
      type: t.string(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Float to String",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput("string", ctx.getInput<number>("float").toString());
  },
  generateIO(io) {
    io.dataInput({
      id: "float",
      type: t.float(),
    });
    io.dataOutput({
      id: "string",
      type: t.string(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Bool to String",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput("string", ctx.getInput<boolean>("bool").toString());
  },
  generateIO(io) {
    io.dataInput({
      id: "bool",
      type: t.bool(),
    });
    io.dataOutput({
      id: "string",
      type: t.string(),
    });
  },
});

pkg.createNonEventSchema({
  name: "String to Int",
  variant: "Pure",
  run({ ctx }) {
    const number = Number(ctx.getInput<string>("string"));
    const opt = Maybe(Number.isNaN(number) ? null : number);

    ctx.setOutput("int", opt.map(Math.floor));
  },
  generateIO(io) {
    io.dataInput({
      id: "string",
      type: t.string(),
    });
    io.dataOutput({
      id: "int",
      type: t.option(t.int()),
    });
  },
});

pkg.createNonEventSchema({
  name: "Multiply Ints",
  variant: "Pure",
  run({ ctx }) {
    const number = Math.floor(
      ctx.getInput<number>("one") * ctx.getInput<number>("two")
    );
    ctx.setOutput("output", number);
  },
  generateIO(io) {
    io.dataInput({
      id: "one",
      type: t.int(),
    });
    io.dataInput({
      id: "two",
      type: t.int(),
    });
    io.dataOutput({
      id: "output",
      type: t.int(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Divide Ints",
  variant: "Pure",
  run({ ctx }) {
    const number = Math.floor(
      ctx.getInput<number>("one") / ctx.getInput<number>("two")
    );
    ctx.setOutput("output", number);
  },
  generateIO(io) {
    io.dataInput({
      id: "one",
      type: t.int(),
    });
    io.dataInput({
      id: "two",
      type: t.int(),
    });
    io.dataOutput({
      id: "output",
      type: t.int(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Add Ints",
  variant: "Pure",
  run({ ctx }) {
    const number = Math.floor(
      ctx.getInput<number>("one") + ctx.getInput<number>("two")
    );
    ctx.setOutput("output", number);
  },
  generateIO(io) {
    io.dataInput({
      id: "one",
      type: t.int(),
    });
    io.dataInput({
      id: "two",
      type: t.int(),
    });
    io.dataOutput({
      id: "output",
      type: t.int(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Subtract Ints",
  variant: "Pure",
  run({ ctx }) {
    const numb = Math.floor(
      ctx.getInput<number>("one") - ctx.getInput<number>("two")
    );
    ctx.setOutput("output", numb);
  },
  generateIO(io) {
    io.dataInput({
      id: "one",
      type: t.int(),
    });
    io.dataInput({
      id: "two",
      type: t.int(),
    });
    io.dataOutput({
      id: "output",
      type: t.int(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Append String",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput(
      "output",
      ctx.getInput<string>("one") + ctx.getInput<string>("two")
    );
  },
  generateIO(io) {
    io.dataInput({
      id: "one",
      type: t.string(),
    });
    io.dataInput({
      id: "two",
      type: t.string(),
    });
    io.dataOutput({
      id: "output",
      type: t.string(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Round Float",
  variant: "Pure",
  run({ ctx }) {
    const input = ctx.getInput<number>("input");
    const decimal = ctx.getInput<number>("decimal");

    ctx.setOutput(
      "output",
      Math.round(input * Math.pow(10, decimal)) / Math.pow(10, decimal)
    );
  },
  generateIO(io) {
    io.dataInput({
      id: "input",
      type: t.float(),
    });
    io.dataInput({
      id: "decimal",
      name: "Decimal Places",
      type: t.int(),
    });
    io.dataOutput({
      id: "output",
      type: t.float(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Random Float",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput("output", Math.random());
  },
  generateIO(io) {
    io.dataOutput({
      id: "output",
      type: t.float(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Random Float In Range",
  variant: "Pure",
  run({ ctx }) {
    const min = ctx.getInput<number>("min");
    const max = ctx.getInput<number>("max");

    ctx.setOutput("output", Math.random() * (max - min) + min);
  },
  generateIO(io) {
    io.dataInput({
      id: "min",
      name: "Min",
      type: t.float(),
    });
    io.dataInput({
      id: "max",
      name: "Max",
      type: t.float(),
    });
    io.dataOutput({
      id: "output",
      type: t.float(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Random Integer",
  variant: "Pure",
  run({ ctx }) {
    // 0.5 triggers round up so distribution is even
    ctx.setOutput("output", Math.round(Math.random()));
  },
  generateIO(io) {
    io.dataOutput({
      id: "output",
      type: t.int(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Random Integer In Range",
  variant: "Pure",
  run({ ctx }) {
    const min = ctx.getInput<number>("min");
    const max = ctx.getInput<number>("max");

    // Use Math.floor to ensure even distribution
    ctx.setOutput("output", Math.floor(Math.random() * (max + 1 - min) + min));
  },
  generateIO(io) {
    io.dataInput({
      id: "min",
      name: "Min",
      type: t.int(),
    });
    io.dataInput({
      id: "max",
      name: "Max",
      type: t.int(),
    });
    io.dataOutput({
      id: "output",
      type: t.int(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Compare Int",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput(
      "outputE",
      ctx.getInput<Number>("number") == ctx.getInput<Number>("compare")
    );
    ctx.setOutput(
      "outputG",
      ctx.getInput<Number>("number") > ctx.getInput<Number>("compare")
    );
    ctx.setOutput(
      "outputL",
      ctx.getInput<Number>("number") < ctx.getInput<Number>("compare")
    );
  },
  generateIO(io) {
    io.dataInput({
      id: "number",
      name: "Number",
      type: t.int(),
    });
    io.dataInput({
      id: "compare",
      name: "Compare against",
      type: t.int(),
    });
    io.dataOutput({
      id: "outputE",
      name: "Equal",
      type: t.bool(),
    });
    io.dataOutput({
      id: "outputG",
      name: "Greater",
      type: t.bool(),
    });
    io.dataOutput({
      id: "outputL",
      name: "Less",
      type: t.bool(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Make Any",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput("output", ctx.getInput("input"));
  },
  generateIO(io) {
    const w = io.wildcard("");

    io.dataInput({
      id: "input",
      type: t.wildcard(w),
    });
    io.dataOutput({
      id: "output",
      type: t.wildcard(w),
    });
  },
});

pkg.createNonEventSchema({
  name: `Equal`,
  variant: "Pure",
  generateIO(io) {
    const w = io.wildcard("");

    io.dataInput({
      id: "one",
      type: t.wildcard(w),
    });
    io.dataInput({
      id: "two",
      type: t.wildcard(w),
    });
    io.dataOutput({
      id: "equal",
      type: t.bool(),
    });
  },
  run({ ctx }) {
    ctx.setOutput("equal", ctx.getInput("one") === ctx.getInput("two"));
  },
});

pkg.createNonEventSchema({
  name: "List Includes",
  variant: "Pure",
  generateIO(io) {
    const w = io.wildcard("");

    io.dataInput({
      id: "input",
      type: t.wildcard(w),
    });
    io.dataInput({
      id: "list",
      type: t.list(t.wildcard(w)),
    });
    io.dataOutput({
      id: "output",
      type: t.bool(),
    });
  },
  run({ ctx }) {
    ctx.setOutput(
      "output",
      ctx.getInput<[]>("list").includes(ctx.getInput("input"))
    );
  },
});

pkg.createNonEventSchema({
  name: "List Length",
  variant: "Pure",
  generateIO(io) {
    io.dataInput({
      id: "list",
      type: t.list(t.wildcard(io.wildcard(""))),
    });
    io.dataOutput({
      id: "output",
      type: t.int(),
    });
  },
  run({ ctx }) {
    ctx.setOutput("output", ctx.getInput<Array<any>>("list").length);
  },
});

pkg.createNonEventSchema({
  name: "Split String",
  variant: "Pure",
  generateIO(io) {
    io.dataInput({
      id: "input",
      name: "String",
      type: t.string(),
    });
    io.dataInput({
      id: "separator",
      name: "Separator",
      type: t.string(),
    });
    io.dataOutput({
      id: "output",
      type: t.list(t.string()),
    });
  },
  run({ ctx }) {
    const array = ctx
      .getInput<string>("input")
      .split(ctx.getInput("separator"));
    ctx.setOutput("output", array);
  },
});

pkg.createNonEventSchema({
  name: "Nth Word",
  variant: "Pure",
  generateIO(io) {
    io.dataInput({
      id: "input",
      type: t.string(),
    });
    io.dataInput({
      id: "index",
      name: "N",
      type: t.int(),
    });
    io.dataOutput({
      id: "output",
      type: t.option(t.string()),
    });
  },
  run({ ctx }) {
    const word = Maybe(
      ctx.getInput<string>("input").trim().split(/\s+/)[
        ctx.getInput<number>("index")
      ]
    );
    ctx.setOutput("output", word);
  },
});

pkg.createNonEventSchema({
  name: `Unwrap Option`,
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput("output", ctx.getInput<Option<string>>("input").unwrap());
  },
  generateIO(io) {
    const w = io.wildcard("");

    io.dataInput({
      id: "input",
      type: t.option(t.wildcard(w)),
    });
    io.dataOutput({
      id: "output",
      type: t.wildcard(w),
    });
  },
});

pkg.createNonEventSchema({
  name: `Is Option Some`,
  variant: "Pure",
  generateIO(io) {
    const w = io.wildcard("");

    io.dataInput({
      id: "input",
      type: t.option(t.wildcard(w)),
    });
    io.dataOutput({
      id: "output",
      type: t.bool(),
    });
  },
  run({ ctx }) {
    ctx.setOutput("output", ctx.getInput<Option<any>>("input").isSome());
  },
});

pkg.createNonEventSchema({
  name: `Is Option None`,
  variant: "Pure",
  generateIO(io) {
    const w = io.wildcard("");

    io.dataInput({
      id: "input",
      type: t.option(t.wildcard(w)),
    });
    io.dataOutput({
      id: "output",
      type: t.bool(),
    });
  },
  run({ ctx }) {
    ctx.setOutput("output", ctx.getInput<Option<any>>("input").isNone());
  },
});

pkg.createNonEventSchema({
  name: `Make Some`,
  variant: "Pure",
  generateIO(io) {
    const type = io.wildcard("");

    io.dataInput({
      id: "in",
      type: t.wildcard(type),
    });
    io.dataOutput({
      id: "out",
      type: t.option(t.wildcard(type)),
    });
  },
  run({ ctx }) {
    ctx.setOutput("out", Some(ctx.getInput<any>("in")));
  },
});

pkg.createNonEventSchema({
  name: "Break Struct",
  variant: "Pure",
  generateIO(io) {
    const w = io.wildcard("");

    io.dataInput({
      id: "",
      type: t.wildcard(w),
    });

    w.value.map((wt) => {
      if (!(wt instanceof t.Struct)) return;

      for (const [id, field] of Object.entries(
        wt.struct.fields as StructFields
      )) {
        io.dataOutput({
          id,
          name: field.name,
          type: field.type,
        });
      }
    });
  },
  run({ ctx, io }) {
    const w = io.wildcards.get("")!;

    const data = ctx.getInput<Record<string, any>>("");

    Object.keys(
      (w.value.unwrap() as t.Struct<StructFields>).struct.fields
    ).forEach((key) => {
      ctx.setOutput(key, data[key]);
    });
  },
});

pkg.createNonEventSchema({
  name: "Match",
  variant: "Base",
  generateIO(io) {
    const w = io.wildcard("");

    io.execInput({
      id: "exec",
    });

    io.dataInput({
      id: "data",
      type: t.wildcard(w),
    });

    w.value.map((v) => {
      if (v instanceof t.Enum) {
        v.inner.variants.forEach((v) => {
          const { name, data } = v;

          if (data === null) {
            io.execOutput({
              id: `out-${name}`,
              name: name,
            });
          } else {
            io.scopeOutput({
              id: `out-${name}`,
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
      } else if (v instanceof t.Option) {
        io.execOutput({
          id: "none",
          name: "None",
        });
        io.scopeOutput({
          id: "some",
          name: "Some",
          scope: (s) => {
            s.output({
              id: "value",
              type: v.inner,
            });
          },
        });
      }
    });
  },
  run({ ctx, io }) {
    const w = io.wildcards.get("")!;

    w.value.map((v) => {
      if (v instanceof t.Enum) {
        const data = ctx.getInput<InferEnum<Enum>>("data");

        if ("data" in data) {
          for (const [key, value] of Object.entries(data)) {
            ctx.setOutput(key, value);
          }
        }

        ctx.exec(data.variant);
      } else if (v instanceof t.Option) {
        const data = ctx.getInput<Option<any>>("data");

        data.mapOrElse(
          () => {
            ctx.exec("none");
          },
          (v) => {
            ctx.execScope("some", v);
          }
        );
      }
    });
  },
});

pkg.createNonEventSchema({
  name: "Break Scope",
  variant: "Base",
  generateIO(io) {
    const scope = io.scope("");

    io.scopeInput({
      id: "",
      scope,
    });

    scope.value.map((scope) => {
      io.execOutput({
        id: "",
      });

      for (const out of scope.outputs) {
        io.dataOutput(out);
      }
    });
  },
  run({ ctx, io }) {
    const w = io.wildcards.get("")!;

    const data = ctx.getInput<Record<string, any>>("");

    Object.keys(
      (w.value.unwrap() as t.Struct<StructFields>).struct.fields
    ).forEach((key) => {
      ctx.setOutput(key, data[key]);
    });
  },
});
