import { Package } from "@macrograph/runtime";
import { Maybe, t } from "@macrograph/typesystem";

export function pkg() {
  const pkg = new Package({
    name: "OBS Physics by Jdude",
  });

  pkg.createNonEventSchema({
    name: "Create Gravity String",
    variant: "Pure",
    createIO({ io }) {
      return {
        gravityX: io.dataInput({
          id: "gravityX",
          name: "X",
          type: t.float(),
        }),
        gravityY: io.dataInput({
          id: "gravityY",
          name: "Y",
          type: t.float(),
        }),
        outputObject: io.dataOutput({
          id: "outputObject",
          type: t.string(),
        }),
      };
    },
    run({ ctx, io }) {
      let string = JSON.stringify({
        type: "gravity",
        gravity: [ctx.getInput(io.gravityX), ctx.getInput(io.gravityY)],
      });

      console.log(string);

      ctx.setOutput(io.outputObject, string);
    },
  });

  return pkg;
}
