import { Maybe, Package, t } from "@macrograph/core";

export function pkg() {
  const pkg = new Package({
    name: "List",
  });

  pkg.createNonEventSchema({
    name: "List Create",
    variant: "Pure",
    properties: {
      number: {
        name: "Entries",
        type: t.int(),
        default: 1,
      },
    },
    generateIO({ io, ctx, properties }) {
      const value = ctx.getProperty(properties.number);
      const w = io.wildcard("");
      const inputs = Array.from({ length: value }, (v, i) => ({
        value: io.dataInput({
          id: `value-${i}`,
          type: t.wildcard(w),
        }),
      }));

      return {
        inputs,
        out: io.dataOutput({
          id: "",
          type: t.list(t.wildcard(w)),
        }),
      };
    },
    run({ ctx, io }) {
      const array = new Array<any>();
      io.inputs.forEach((input) => {
        array.push(ctx.getInput(input.value));
      });

      ctx.setOutput(io.out, array);
    },
  });

  pkg.createNonEventSchema({
    name: "Push List Value",
    variant: "Exec",
    generateIO({ io }) {
      const w = io.wildcard("");

      return {
        list: io.dataInput({
          id: "list",
          type: t.list(t.wildcard(w)),
        }),
        value: io.dataInput({
          id: "value",
          type: t.wildcard(w),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.getInput(io.list).push(ctx.getInput(io.value));
    },
  });

  pkg.createNonEventSchema({
    name: "Insert List Value",
    variant: "Exec",
    generateIO({ io }) {
      const w = io.wildcard("");

      return {
        list: io.dataInput({
          id: "list",
          type: t.list(t.wildcard(w)),
        }),
        index: io.dataInput({
          id: "index",
          type: t.int(),
        }),
        value: io.dataInput({
          id: "value",
          type: t.wildcard(w),
        }),
      };
    },
    run({ ctx, io }) {
      ctx
        .getInput(io.list)
        .splice(ctx.getInput(io.index), 0, ctx.getInput(io.value));
    },
  });

  pkg.createNonEventSchema({
    name: "Set List Value",
    variant: "Exec",
    generateIO({ io }) {
      const w = io.wildcard("");

      return {
        list: io.dataInput({
          id: "list",
          type: t.list(t.wildcard(w)),
        }),
        index: io.dataInput({
          id: "index",
          type: t.int(),
        }),
        value: io.dataInput({
          id: "value",
          type: t.wildcard(w),
        }),
      };
    },
    run({ ctx, io }) {
      ctx
        .getInput(io.list)
        .splice(ctx.getInput(io.index), 1, ctx.getInput(io.value));
    },
  });

  pkg.createNonEventSchema({
    name: "Remove List Value",
    variant: "Exec",
    generateIO({ io }) {
      const w = io.wildcard("");

      return {
        list: io.dataInput({
          id: "list",
          type: t.list(t.wildcard(w)),
        }),
        index: io.dataInput({
          id: "index",
          type: t.int(),
        }),
        return: io.dataOutput({
          id: "return",
          name: "Removed Value",
          type: t.wildcard(w),
        }),
      };
    },
    run({ ctx, io }) {
      ctx.setOutput(
        io.return,
        ctx.getInput(io.list).splice(ctx.getInput(io.index), 1)[0]
      );
    },
  });

  pkg.createNonEventSchema({
    name: "Get List Value",
    variant: "Pure",
    generateIO({ io }) {
      const w = io.wildcard("");

      return {
        list: io.dataInput({
          id: "list",
          type: t.list(t.wildcard(w)),
        }),
        index: io.dataInput({
          id: "index",
          type: t.int(),
        }),
        return: io.dataOutput({
          id: "return",
          name: "Value",
          type: t.option(t.wildcard(w)),
        }),
      };
    },
    run({ ctx, io }) {
      const array = ctx.getInput(io.list);
      const index = ctx.getInput(io.index);

      ctx.setOutput(
        io.return,
        Maybe(array[index < 0 ? array.length + index : index])
      );
    },
  });

  return pkg;
}
