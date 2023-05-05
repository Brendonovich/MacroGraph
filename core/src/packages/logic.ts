import { core } from "../models";
import { types } from "../types";

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
  name: "String Array Iterator",
  variant: "Base",
  run({ ctx }) {
    const ARRAY = ctx.getInput("array") as Array<string>;
    ARRAY.forEach(data => {
      ctx.setOutput("output", data);
      ctx.exec("execOut");
    });

  },
  generateIO(builder) {
    builder.execInput({
      id: "exec",
    });
    builder.execOutput({
      id: "execOut",
    });
    builder.dataInput({
      id: "array",
      type: types.list(types.string()),
    });
    builder.dataOutput({
      id: "output",
      type: types.string(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Int Array Iterator",
  variant: "Base",
  run({ ctx }) {
    const ARRAY = ctx.getInput("array") as Array<string>;
    ARRAY.forEach(data => {
      ctx.setOutput("output", data);
      ctx.exec("execOut");
    });

  },
  generateIO(builder) {
    builder.execInput({
      id: "exec",
    });
    builder.execOutput({
      id: "execOut",
    });
    builder.dataInput({
      id: "array",
      type: types.list(types.int()),
    });
    builder.dataOutput({
      id: "output",
      type: types.int(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Float Array Iterator",
  variant: "Base",
  run({ ctx }) {
    const ARRAY = ctx.getInput("array") as Array<string>;
    ARRAY.forEach(data => {
      ctx.setOutput("output", data);
      ctx.exec("execOut");
    });

  },
  generateIO(builder) {
    builder.execInput({
      id: "exec",
    });
    builder.execOutput({
      id: "execOut",
    });
    builder.dataInput({
      id: "array",
      type: types.list(types.float()),
    });
    builder.dataOutput({
      id: "output",
      type: types.float(),
    });
  },
});

pkg.createNonEventSchema({
  name: "Bool Array Iterator",
  variant: "Base",
  run({ ctx }) {
    const ARRAY = ctx.getInput("array") as Array<string>;
    ARRAY.forEach(data => {
      ctx.setOutput("output", data);
      ctx.exec("execOut");
    });

  },
  generateIO(builder) {
    builder.execInput({
      id: "exec",
    });
    builder.execOutput({
      id: "execOut",
    });
    builder.dataInput({
      id: "array",
      type: types.list(types.bool()),
    });
    builder.dataOutput({
      id: "output",
      type: types.bool(),
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
  name: "Bools Equal",
  variant: "Pure",
  run({ ctx }) {
    ctx.setOutput(
      "value",
      ctx.getInput<boolean>("one") == ctx.getInput<boolean>("two")
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
  name: "Bools Not Equal",
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

const typeArray = [
  ["Bool", types.bool()],
  ["String", types.string()],
  ["Int", types.int()],
  ["Float", types.float()],
] as const;

typeArray.forEach(([key, type]) => {
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
});
