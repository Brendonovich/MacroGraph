import { createPackage, Maybe, t } from "@macrograph/core";

export const pkg = createPackage({
  name: "List",
});

pkg.createNonEventSchema({
  name: "Push List Value",
  variant: "Exec",
  generateIO(io) {
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
  generateIO(io) {
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
  generateIO(io) {
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
  generateIO(io) {
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
  generateIO(io) {
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
