import { core } from "../models";
import { types } from "../types";

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
  generateIO(builder) {
    builder.dataInput({
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
  generateIO(builder) {
    builder.dataInput({
      id: "haystack",
      name: "String",
      type: types.string(),
    });
    builder.dataInput({
      id: "needle",
      name: "Includes",
      type: types.string(),
    });
    builder.dataOutput({
      id: "bool",
      name: "",
      type: types.bool(),
    });
  },
});

pkg.createNonEventSchema({
  name: "String Starts With",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput(
      "bool",
      ctx
        .getInput<string>("haystack")
        .startsWith(ctx.getInput<string>("needle"))
    );
  },
  generateIO(builder) {
    builder.dataInput({
      id: "haystack",
      name: "String",
      type: types.string(),
    });
    builder.dataInput({
      id: "needle",
      name: "Starts With",
      type: types.string(),
    });
    builder.dataOutput({
      id: "bool",
      name: "",
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
        : ctx.getInput<string>("string").length;
    ctx.setOutput(
      "stringOut",
      ctx.getInput<string>("string").substring(start, end)
    );
  },
  generateIO(builder) {
    builder.dataInput({
      id: "string",
      name: "",
      type: types.string(),
    });
    builder.dataInput({
      id: "start",
      name: "Start",
      type: types.int(),
    });
    builder.dataInput({
      id: "end",
      name: "End",
      type: types.int(),
    });
    builder.dataOutput({
      id: "stringOut",
      name: "",
      type: types.string(),
    });
  },
});

pkg.createNonEventSchema({
  name: "String To Uppercase",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput("upper", ctx.getInput<string>("string").toUpperCase());
  },
  generateIO(builder) {
    builder.dataInput({
      id: "string",
      name: "",
      type: types.string(),
    });
    builder.dataOutput({
      id: "upper",
      name: "",
      type: types.string(),
    });
  },
});

pkg.createNonEventSchema({
  name: "String To Lowercase",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput("lower", ctx.getInput<string>("string").toLowerCase());
  },
  generateIO(builder) {
    builder.dataInput({
      id: "string",
      name: "",
      type: types.string(),
    });
    builder.dataOutput({
      id: "lower",
      name: "",
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
  generateIO(builder) {
    builder.dataInput({
      id: "int",
      name: "",
      type: types.int(),
    });
    builder.dataOutput({
      id: "string",
      name: "",
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
  generateIO(builder) {
    builder.dataInput({
      id: "bool",
      name: "",
      type: types.bool(),
    });
    builder.dataOutput({
      id: "string",
      name: "",
      type: types.string(),
    });
  },
});

pkg.createNonEventSchema({
  name: "String to Int",
  variant: "Pure",
  run({ ctx }) {
    let number = Number(ctx.getInput<string>("string"));
    ctx.setOutput("int", number);
    ctx.setOutput("pass", !Number.isNaN(number));
  },
  generateIO(builder) {
    builder.dataOutput({
      id: "int",
      name: "",
      type: types.int(),
    });
    builder.dataOutput({
      id: "pass",
      name: "Passed",
      type: types.bool(),
    });
    builder.dataInput({
      id: "string",
      name: "",
      type: types.string(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Multiply",
  variant: "Pure",
  run({ ctx }) {
    const numb = ctx.getInput<number>("num1") * ctx.getInput<number>("num2");
    ctx.setOutput("outnum", numb);
  },
  generateIO(builder) {
    builder.dataInput({
      id: "num1",
      name: "",
      type: types.int(),
    });
    builder.dataInput({
      id: "num2",
      name: "",
      type: types.int(),
    });
    builder.dataOutput({
      id: "outnum",
      name: "",
      type: types.int(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Divide",
  variant: "Pure",
  run({ ctx }) {
    const numb = ctx.getInput<number>("num1") / ctx.getInput<number>("num2");
    ctx.setOutput("outnum", numb);
  },
  generateIO(builder) {
    builder.dataInput({
      id: "num1",
      name: "",
      type: types.int(),
    });
    builder.dataInput({
      id: "num2",
      name: "",
      type: types.int(),
    });
    builder.dataOutput({
      id: "outnum",
      name: "",
      type: types.int(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Add",
  variant: "Pure",
  run({ ctx }) {
    const numb = ctx.getInput<number>("num1") + ctx.getInput<number>("num2");
    ctx.setOutput("outnum", numb);
  },
  generateIO(builder) {
    builder.dataInput({
      id: "num1",
      name: "",
      type: types.int(),
    });
    builder.dataInput({
      id: "num2",
      name: "",
      type: types.int(),
    });
    builder.dataOutput({
      id: "outnum",
      name: "",
      type: types.int(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Subtract",
  variant: "Pure",
  run({ ctx }) {
    const numb = ctx.getInput<number>("num1") - ctx.getInput<number>("num2");
    ctx.setOutput("outnum", numb);
  },
  generateIO(builder) {
    builder.dataInput({
      id: "num1",
      name: "",
      type: types.int(),
    });
    builder.dataInput({
      id: "num2",
      name: "",
      type: types.int(),
    });
    builder.dataOutput({
      id: "outnum",
      name: "",
      type: types.int(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Append",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput(
      "out",
      ctx.getInput<string>("one") + ctx.getInput<string>("two")
    );
  },
  generateIO(builder) {
    builder.dataInput({
      id: "one",
      name: "",
      type: types.string(),
    });
    builder.dataInput({
      id: "two",
      name: "",
      type: types.string(),
    });
    builder.dataOutput({
      id: "out",
      name: "",
      type: types.string(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Round",
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
      name: "",
      type: types.float(),
    });
    t.dataInput({
      id: "decimal",
      name: "Decimal Places",
      type: types.int(),
    });
    t.dataOutput({
      id: "output",
      name: "",
      type: types.int(),
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
      name: "",
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
      name: "",
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
      name: "",
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
      name: "",
      type: types.float(),
    });
  },
});
