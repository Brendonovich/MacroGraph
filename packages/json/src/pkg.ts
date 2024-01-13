import { Package } from "@macrograph/runtime";
import { Maybe, None, Some, t } from "@macrograph/typesystem";

import { JSON } from "./type";
import { jsToJSON, jsonToJS, toJSON } from "./conversion";

export function pkg() {
  const pkg = new Package({
    name: "JSON",
    ctx: {},
  });

  pkg.createNonEventSchema({
    name: "To JSON",
    variant: "Pure",
    createIO({ io }) {
      const w = io.wildcard("");

      return {
        w,
        in: io.dataInput({
          id: "in",
          type: t.wildcard(w),
        }),
        out: io.dataOutput({
          id: "out",
          type: t.enum(JSON),
        }),
      };
    },
    run({ ctx, io }) {
      const val = Maybe(toJSON(io.in.type, ctx.getInput(io.in)));
      ctx.setOutput(
        io.out,
        val.expect(`Type ${io.w.toString()} cannot be converted to JSON!`)
      );
    },
  });

  pkg.createNonEventSchema({
    name: "Parse JSON",
    variant: "Exec",
    createIO({ io }) {
      return {
        in: io.dataInput({
          id: "in",
          type: t.string(),
        }),
        out: io.dataOutput({
          id: "out",
          type: t.enum(JSON),
        }),
      };
    },
    run({ ctx, io }) {
      const value = jsToJSON(window.JSON.parse(ctx.getInput(io.in)));
      ctx.setOutput(io.out, Maybe(value).expect("Failed to parse JSON!"));
    },
  });

  pkg.createNonEventSchema({
    name: "JSON Get String",
    variant: "Pure",
    createIO({ io }) {
      return {
        in: io.dataInput({
          id: "in",
          type: t.enum(JSON),
        }),
        out: io.dataOutput({
          id: "out",
          type: t.option(t.string()),
        }),
      };
    },
    run({ ctx, io }) {
      const input = ctx.getInput(io.in);

      ctx.setOutput(
        io.out,
        input.variant === "String" ? Some(jsonToJS(input)) : None
      );
    },
  });

  pkg.createNonEventSchema({
    name: "JSON Get Number",
    variant: "Pure",
    createIO({ io }) {
      return {
        in: io.dataInput({
          id: "in",
          type: t.enum(JSON),
        }),
        out: io.dataOutput({
          id: "out",
          type: t.option(t.float()),
        }),
      };
    },
    run({ ctx, io }) {
      const input = ctx.getInput(io.in);

      ctx.setOutput(
        io.out,
        input.variant === "Number" ? Some(jsonToJS(input)) : None
      );
    },
  });

  pkg.createNonEventSchema({
    name: "JSON Get Boolean",
    variant: "Pure",
    createIO({ io }) {
      return {
        in: io.dataInput({
          id: "in",
          type: t.enum(JSON),
        }),
        out: io.dataOutput({
          id: "out",
          type: t.option(t.bool()),
        }),
      };
    },
    run({ ctx, io }) {
      const input = ctx.getInput(io.in);

      ctx.setOutput(
        io.out,
        input.variant === "Bool" ? Some(jsonToJS(input)) : None
      );
    },
  });

  pkg.createNonEventSchema({
    name: "JSON Get List",
    variant: "Pure",
    createIO({ io }) {
      return {
        in: io.dataInput({
          id: "in",
          type: t.enum(JSON),
        }),
        out: io.dataOutput({
          id: "out",
          type: t.option(t.list(t.enum(JSON))),
        }),
      };
    },
    run({ ctx, io }) {
      const input = ctx.getInput(io.in);

      ctx.setOutput(
        io.out,
        input.variant === "List" ? Some(input.data.value) : None
      );
    },
  });

  pkg.createNonEventSchema({
    name: "JSON Get Map",
    variant: "Pure",
    createIO({ io }) {
      return {
        in: io.dataInput({
          id: "in",
          type: t.enum(JSON),
        }),
        out: io.dataOutput({
          id: "out",
          type: t.option(t.map(t.enum(JSON))),
        }),
      };
    },
    run({ ctx, io }) {
      const input = ctx.getInput(io.in);

      ctx.setOutput(
        io.out,
        input.variant === "Map" ? Some(input.data.value) : None
      );
    },
  });

  return pkg;
}
