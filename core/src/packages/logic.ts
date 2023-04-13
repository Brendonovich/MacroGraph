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
      name: "",
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
