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
  generateIO(builder) {
    builder.execInput({
      id: "exec",
      name: "",
    });
    builder.dataInput({
      id: "condition",
      name: "Condition",
      type: types.bool(),
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
