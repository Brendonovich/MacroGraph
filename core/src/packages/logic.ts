import { core } from "../models";

const pkg = core.createPackage({
  name: "Logic",
});

pkg.createSchema({
  name: "Branch",
  variant: "Base",
  run({ ctx }) {
    ctx.exec(ctx.getInput<boolean>("condition") ? "true" : "false");
  },
  generateIO(builder) {
    builder.execInput({
      id: "exec",
      name: "",
    });
    builder.dataInput({
      id: "condition",
      name: "Condition",
      type: {
        variant: "primitive",
        value: "bool",
      },
    });

    builder.execOutput({
      id: "true",
      name: "True",
    });
    builder.execOutput({
      id: "false",
      name: "False",
    });
  },
});
