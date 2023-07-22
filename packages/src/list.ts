import { core, Maybe, Option, t } from "@macrograph/core";

const pkg = core.createPackage({
  name: "List",
});

pkg.createNonEventSchema({
  name: "Push List Value",
  variant: "Exec",
  generateIO(io) {
    const w = io.wildcard("");

    io.dataInput({
      id: "list",
      type: t.list(t.wildcard(w)),
    });
    io.dataInput({
      id: "value",
      type: t.wildcard(w),
    });
  },
  run({ ctx }) {
    ctx.getInput<Array<any>>("list").push(ctx.getInput("value"));
  },
});

pkg.createNonEventSchema({
  name: "Insert List Value",
  variant: "Exec",
  generateIO(io) {
    const w = io.wildcard("");

    io.dataInput({
      id: "list",
      type: t.list(t.wildcard(w)),
    });
    io.dataInput({
      id: "index",
      type: t.int(),
    });
    io.dataInput({
      id: "value",
      type: t.wildcard(w),
    });
  },
  run({ ctx }) {
    ctx
      .getInput<Array<any>>("list")
      .splice(ctx.getInput("index"), 0, ctx.getInput("value"));
  },
});

pkg.createNonEventSchema({
  name: "Set List Value",
  variant: "Exec",
  generateIO(io) {
    const w = io.wildcard("");

    io.dataInput({
      id: "list",
      type: t.list(t.wildcard(w)),
    });
    io.dataInput({
      id: "index",
      type: t.int(),
    });
    io.dataInput({
      id: "value",
      type: t.wildcard(w),
    });
  },
  run({ ctx }) {
    ctx
      .getInput<Array<any>>("list")
      .splice(ctx.getInput("index"), 1, ctx.getInput("value"));
  },
});

pkg.createNonEventSchema({
  name: "Remove List Value",
  variant: "Exec",
  generateIO(io) {
    const w = io.wildcard("");

    io.dataInput({
      id: "list",
      type: t.list(t.wildcard(w)),
    });
    io.dataInput({
      id: "index",
      type: t.int(),
    });
    io.dataOutput({
      id: "return",
      name: "Removed Value",
      type: t.wildcard(w),
    });
  },
  run({ ctx }) {
    ctx.setOutput(
      "return",
      ctx.getInput<Array<any>>("list").splice(ctx.getInput("index"), 1)[0]
    );
  },
});

pkg.createNonEventSchema({
  name: "Get List Value",
  variant: "Pure",
  generateIO(io) {
    const w = io.wildcard("");

    io.dataInput({
      id: "list",
      type: t.list(t.wildcard(w)),
    });
    io.dataInput({
      id: "index",
      type: t.int(),
    });
    io.dataOutput({
      id: "return",
      name: "Value",
      type: t.option(t.wildcard(w)),
    });
  },
  run({ ctx }) {
    const array = ctx.getInput<Array<any>>("list");
    const index = ctx.getInput<number>("index");

    ctx.setOutput<Option<any>>(
      "return",
      Maybe(array[index < 0 ? array.length + index : index])
    );
  },
});
