import { core, Maybe, Option, Some, types } from "@macrograph/core";

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
  generateIO(t) {
    t.dataInput({
      id: "input",
      name: "Input",
      type: types.string(),
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
  generateIO(t) {
    t.dataInput({
      id: "haystack",
      name: "String",
      type: types.string(),
    });
    t.dataInput({
      id: "needle",
      name: "Includes",
      type: types.string(),
    });
    t.dataOutput({
      id: "bool",
      type: types.bool(),
    });
  },
});

pkg.createNonEventSchema({
  name: "String Length",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput("int", ctx.getInput<string>("input").length);
  },
  generateIO(t) {
    t.dataInput({
      id: "input",
      name: "String",
      type: types.string(),
    });
    t.dataOutput({
      id: "int",
      type: types.int(),
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
  generateIO(t) {
    t.dataInput({
      id: "input",
      name: "String",
      type: types.string(),
    });
    t.dataInput({
      id: "prefix",
      name: "Starts With",
      type: types.string(),
    });
    t.dataOutput({
      id: "bool",
      type: types.bool(),
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
  generateIO(t) {
    t.dataInput({
      id: "input",
      type: types.string(),
    });
    t.dataInput({
      id: "start",
      name: "Start",
      type: types.int(),
    });
    t.dataInput({
      id: "end",
      name: "End",
      type: types.int(),
    });
    t.dataOutput({
      id: "output",
      type: types.string(),
    });
  },
});

pkg.createNonEventSchema({
  name: "String To Uppercase",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput("output", ctx.getInput<string>("input").toUpperCase());
  },
  generateIO(t) {
    t.dataInput({
      id: "input",
      type: types.string(),
    });
    t.dataOutput({
      id: "output",
      type: types.string(),
    });
  },
});

pkg.createNonEventSchema({
  name: "String To Lowercase",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput("output", ctx.getInput<string>("input").toLowerCase());
  },
  generateIO(t) {
    t.dataInput({
      id: "input",
      type: types.string(),
    });
    t.dataOutput({
      id: "output",
      type: types.string(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Int to String",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput("string", ctx.getInput<number>("int").toString());
  },
  generateIO(t) {
    t.dataInput({
      id: "int",
      type: types.int(),
    });
    t.dataOutput({
      id: "string",
      type: types.string(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Float to String",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput("string", ctx.getInput<number>("float").toString());
  },
  generateIO(t) {
    t.dataInput({
      id: "float",
      type: types.float(),
    });
    t.dataOutput({
      id: "string",
      type: types.string(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Bool to String",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput("string", ctx.getInput<boolean>("bool").toString());
  },
  generateIO(t) {
    t.dataInput({
      id: "bool",
      type: types.bool(),
    });
    t.dataOutput({
      id: "string",
      type: types.string(),
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
  generateIO(t) {
    t.dataInput({
      id: "string",
      type: types.string(),
    });
    t.dataOutput({
      id: "int",
      type: types.option(types.int()),
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
  generateIO(t) {
    t.dataInput({
      id: "one",
      type: types.int(),
    });
    t.dataInput({
      id: "two",
      type: types.int(),
    });
    t.dataOutput({
      id: "output",
      type: types.int(),
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
  generateIO(t) {
    t.dataInput({
      id: "one",
      type: types.int(),
    });
    t.dataInput({
      id: "two",
      type: types.int(),
    });
    t.dataOutput({
      id: "output",
      type: types.int(),
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
  generateIO(t) {
    t.dataInput({
      id: "one",
      type: types.int(),
    });
    t.dataInput({
      id: "two",
      type: types.int(),
    });
    t.dataOutput({
      id: "output",
      type: types.int(),
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
  generateIO(t) {
    t.dataInput({
      id: "one",
      type: types.int(),
    });
    t.dataInput({
      id: "two",
      type: types.int(),
    });
    t.dataOutput({
      id: "output",
      type: types.int(),
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
  generateIO(t) {
    t.dataInput({
      id: "one",
      type: types.string(),
    });
    t.dataInput({
      id: "two",
      type: types.string(),
    });
    t.dataOutput({
      id: "output",
      type: types.string(),
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
  generateIO(t) {
    t.dataInput({
      id: "input",
      type: types.float(),
    });
    t.dataInput({
      id: "decimal",
      name: "Decimal Places",
      type: types.int(),
    });
    t.dataOutput({
      id: "output",
      type: types.float(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Random Float",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput("output", Math.random());
  },
  generateIO(t) {
    t.dataOutput({
      id: "output",
      type: types.float(),
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
  generateIO(t) {
    t.dataInput({
      id: "min",
      name: "Min",
      type: types.float(),
    });
    t.dataInput({
      id: "max",
      name: "Max",
      type: types.float(),
    });
    t.dataOutput({
      id: "output",
      type: types.float(),
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
  generateIO(t) {
    t.dataOutput({
      id: "output",
      type: types.int(),
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
  generateIO(t) {
    t.dataInput({
      id: "min",
      name: "Min",
      type: types.int(),
    });
    t.dataInput({
      id: "max",
      name: "Max",
      type: types.int(),
    });
    t.dataOutput({
      id: "output",
      type: types.int(),
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
  generateIO(t) {
    t.dataInput({
      id: "number",
      name: "Number",
      type: types.int(),
    });
    t.dataInput({
      id: "compare",
      name: "Compare against",
      type: types.int(),
    });
    t.dataOutput({
      id: "outputE",
      name: "Equal",
      type: types.bool(),
    });
    t.dataOutput({
      id: "outputG",
      name: "Greater",
      type: types.bool(),
    });
    t.dataOutput({
      id: "outputL",
      name: "Less",
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
    name: `Equal (${key})`,
    variant: "Pure",
    generateIO(io) {
      io.dataInput({
        id: "one",
        type,
      });
      io.dataInput({
        id: "two",
        type,
      });
      io.dataOutput({
        id: "equal",
        type: types.bool(),
      });
    },
    run({ ctx }) {
      ctx.setOutput("equal", ctx.getInput("one") === ctx.getInput("two"));
    },
  });

  pkg.createNonEventSchema({
    name: `Unwrap Option (${key})`,
    variant: "Pure",
    run({ ctx }) {
      ctx.setOutput("output", ctx.getInput<Option<string>>("input").unwrap());
    },
    generateIO(t) {
      t.dataInput({
        id: "input",
        type: types.option(type),
      });
      t.dataOutput({
        id: "output",
        type,
      });
    },
  });

  pkg.createNonEventSchema({
    name: `Is Option Some (${key})`,
    variant: "Pure",
    generateIO(io) {
      io.dataInput({
        id: "input",
        type: types.option(type),
      });
      io.dataOutput({
        id: "output",
        type: types.bool(),
      });
    },
    run({ ctx }) {
      ctx.setOutput("output", ctx.getInput<Option<any>>("input").isSome());
    },
  });

  pkg.createNonEventSchema({
    name: `Is Option None(${key})`,
    variant: "Pure",
    generateIO(io) {
      io.dataInput({
        id: "input",
        type: types.option(type),
      });
      io.dataOutput({
        id: "output",
        type: types.bool(),
      });
    },
    run({ ctx }) {
      ctx.setOutput("output", ctx.getInput<Option<any>>("input").isNone());
    },
  });

  pkg.createNonEventSchema({
    name: key,
    variant: "Pure",
    run({ ctx }) {
      ctx.setOutput("output", ctx.getInput("input"));
    },
    generateIO(t) {
      t.dataInput({
        id: "input",
        type,
      });
      t.dataOutput({
        id: "output",
        type,
      });
    },
  });
});

pkg.createNonEventSchema({
  name: `Make Some`,
  variant: "Pure",
  generateIO(io) {
    const type = io.wildcard();

    io.dataInput({
      id: "in",
      type: types.wildcard(type),
    });
    io.dataOutput({
      id: "out",
      type: types.option(types.wildcard(type)),
    });
  },
  run({ ctx }) {
    ctx.setOutput("out", Some(ctx.getInput<any>("in")));
  },
});
