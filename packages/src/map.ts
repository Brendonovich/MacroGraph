import { core, Maybe, t } from "@macrograph/core";

const pkg = core.createPackage({
  name: "Map",
});

pkg.createNonEventSchema({
  name: "Map Get",
  variant: "Pure",
  generateIO(io) {
    const w = io.wildcard("");

    io.dataInput({
      id: "map",
      type: t.map(t.wildcard(w)),
    });
    io.dataInput({
      id: "key",
      type: t.string(),
    });

    io.dataOutput({
      id: "out",
      type: t.option(t.wildcard(w)),
    });
  },
  run({ ctx }) {
    const map = ctx.getInput<Map<string, any>>("map");
    const key = ctx.getInput<string>("key");

    ctx.setOutput("out", Maybe(map.get(key)));
  },
});

pkg.createNonEventSchema({
  name: "Map Insert",
  variant: "Exec",
  generateIO(io) {
    const w = io.wildcard("");

    io.dataInput({
      id: "map",
      type: t.map(t.wildcard(w)),
    });
    io.dataInput({
      id: "key",
      type: t.string(),
    });
    io.dataInput({
      id: "value",
      type: t.wildcard(w),
    });

    io.dataOutput({
      id: "out",
      type: t.option(t.wildcard(w)),
    });
  },
  run({ ctx }) {
    const map = ctx.getInput<Map<string, any>>("map");
    const key = ctx.getInput<string>("key");
    const value = ctx.getInput("value");

    const current = Maybe(map.get(key));

    map.set(key, value);

    ctx.setOutput("out", current);
  },
});

pkg.createNonEventSchema({
  name: "Map Clear",
  variant: "Exec",
  generateIO(io) {
    const w = io.wildcard("");

    io.dataInput({
      id: "map",
      type: t.map(t.wildcard(w)),
    });
  },
  run({ ctx }) {
    ctx.getInput<Map<string, any>>("map").clear();
  },
});

pkg.createNonEventSchema({
  name: "Map Contains",
  variant: "Pure",
  generateIO(io) {
    const w = io.wildcard("");

    io.dataInput({
      id: "map",
      type: t.map(t.wildcard(w)),
    });
    io.dataInput({
      id: "key",
      type: t.string(),
    });

    io.dataOutput({
      id: "out",
      type: t.bool(),
    });
  },
  run({ ctx }) {
    const map = ctx.getInput<Map<string, any>>("map");
    const key = ctx.getInput<string>("key");

    ctx.setOutput("out", map.has(key));
  },
});

pkg.createNonEventSchema({
  name: "Map Keys",
  variant: "Pure",
  generateIO(io) {
    const w = io.wildcard("");

    io.dataInput({
      id: "map",
      type: t.map(t.wildcard(w)),
    });

    io.dataOutput({
      id: "keys",
      type: t.list(t.string()),
    });
  },
  run({ ctx }) {
    const map = ctx.getInput<Map<string, any>>("map");

    ctx.setOutput("keys", [...map.keys()]);
  },
});

pkg.createNonEventSchema({
  name: "Map Values",
  variant: "Pure",
  generateIO(io) {
    const w = io.wildcard("");

    io.dataInput({
      id: "map",
      type: t.map(t.wildcard(w)),
    });

    io.dataOutput({
      id: "values",
      type: t.list(t.wildcard(w)),
    });
  },
  run({ ctx }) {
    const map = ctx.getInput<Map<string, any>>("map");

    ctx.setOutput("values", [...map.values()]);
  },
});

pkg.createNonEventSchema({
  name: "Map Size",
  variant: "Pure",
  generateIO(io) {
    const w = io.wildcard("");

    io.dataInput({
      id: "map",
      type: t.map(t.wildcard(w)),
    });

    io.dataOutput({
      id: "size",
      type: t.int(),
    });
  },
  run({ ctx }) {
    const map = ctx.getInput<Map<string, any>>("map");

    ctx.setOutput("out", map.size);
  },
});

pkg.createNonEventSchema({
  name: "Map Remove",
  variant: "Exec",
  generateIO(io) {
    const w = io.wildcard("");

    io.dataInput({
      id: "map",
      type: t.map(t.wildcard(w)),
    });
    io.dataInput({
      id: "key",
      type: t.string(),
    });

    io.dataOutput({
      id: "out",
      type: t.option(t.wildcard(w)),
    });
  },
  run({ ctx }) {
    const map = ctx.getInput<Map<string, any>>("map");
    const key = ctx.getInput<string>("key");

    const current = Maybe(map.get(key));

    map.delete(key);

    ctx.setOutput("out", current);
  },
});
