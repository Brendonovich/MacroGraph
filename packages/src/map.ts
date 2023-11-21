import { Package, Maybe, t } from "@macrograph/core";

export function pkg() {
  const pkg = new Package({
    name: "Map",
  });

  pkg.createNonEventSchema({
    name: "Map Get",
    variant: "Pure",
    properties: {
      number: {
        name: "Number of Keys",
        type: t.int(),
      },
    },
    generateIO({ io, ctx, properties }) {
      const value = ctx.getProperty(properties.number);
      const w = io.wildcard("");
      return {
        mapIn: io.dataInput({
          id: "map",
          type: t.map(t.wildcard(w)),
        }),
        mapOut: io.dataOutput({
          id: "map",
          type: t.map(t.wildcard(w)),
        }),
        pins: Array.from({ length: value }, (v, i) => ({
          key: io.dataInput({
            id: `key-${i}`,
            type: t.string(),
          }),
          value: io.dataOutput({
            id: `value-${i}`,
            type: t.option(t.wildcard(w)),
          }),
        })),
      };
    },
    run({ ctx, io }) {
      const map = ctx.getInput(io.mapIn);
      ctx.setOutput(io.mapOut, map);
      io.pins.forEach((input) => {
        ctx.setOutput(input.value, Maybe(map.get(ctx.getInput(input.key))));
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Map Insert",
    variant: "Exec",
    properties: {
      number: {
        name: "Number of Keys",
        type: t.int(),
      },
    },
    generateIO({ io, ctx, properties }) {
      const w = io.wildcard("");
      const value = ctx.getProperty(properties.number);
      return {
        map: io.dataInput({
          id: "map",
          type: t.map(t.wildcard(w)),
        }),
        pins: Array.from({ length: value }, (v, i) => ({
          key: io.dataInput({
            id: `key-${i}`,
            type: t.string(),
          }),
          value: io.dataInput({
            id: `value-${i}`,
            type: t.wildcard(w),
          }),
          current: io.dataOutput({
            id: `current-${i}`,
            type: t.option(t.wildcard(w)),
          }),
        })),
      };
    },
    run({ ctx, io }) {
      const map = ctx.getInput(io.map);
      io.pins.forEach((input) => {
        map.set(ctx.getInput(input.key), ctx.getInput(input.value));
        ctx.setOutput(input.current, Maybe(map.get(ctx.getInput(input.key))));
      });
    },
  });

  pkg.createNonEventSchema({
    name: "Map Create",
    variant: "Pure",
    properties: {
      number: {
        name: "Number of Keys",
        type: t.int(),
      },
    },
    generateIO({ io, ctx, properties }) {
      const value = ctx.getProperty(properties.number);
      const w = io.wildcard("");
      const inputs = Array.from({ length: value }, (v, i) => ({
        key: io.dataInput({
          id: `key-${i}`,
          type: t.string(),
        }),
        value: io.dataInput({
          id: `value-${i}`,
          type: t.wildcard(w),
        }),
      }));

      return {
        inputs,
        out: io.dataOutput({
          id: "",
          type: t.map(t.wildcard(w)),
        }),
      };
    },
    run({ ctx, io }) {
      const map = new Map<string, any>();
      io.inputs.forEach((input) => {
        map.set(ctx.getInput(input.key), ctx.getInput(input.value));
      });

      ctx.setOutput(io.out, map);
    },
  });

  pkg.createNonEventSchema({
    name: "Map Clear",
    variant: "Exec",
    generateIO({ io }) {
      const w = io.wildcard("");

      return io.dataInput({
        id: "map",
        type: t.map(t.wildcard(w)),
      });
    },
    run({ ctx, io }) {
      ctx.getInput(io).clear();
    },
  });

  pkg.createNonEventSchema({
    name: "Map Contains",
    variant: "Pure",
    generateIO({ io }) {
      const w = io.wildcard("");

      return {
        map: io.dataInput({
          id: "map",
          type: t.map(t.wildcard(w)),
        }),
        key: io.dataInput({
          id: "key",
          type: t.string(),
        }),
        out: io.dataOutput({
          id: "out",
          type: t.bool(),
        }),
      };
    },
    run({ ctx, io }) {
      const map = ctx.getInput(io.map);
      const key = ctx.getInput(io.key);

      ctx.setOutput(io.out, map.has(key));
    },
  });

  pkg.createNonEventSchema({
    name: "Map Keys",
    variant: "Pure",
    generateIO({ io }) {
      const w = io.wildcard("");

      return {
        map: io.dataInput({
          id: "map",
          type: t.map(t.wildcard(w)),
        }),
        keys: io.dataOutput({
          id: "keys",
          type: t.list(t.string()),
        }),
      };
    },
    run({ ctx, io }) {
      const map = ctx.getInput(io.map);

      ctx.setOutput(io.keys, [...map.keys()]);
    },
  });

  pkg.createNonEventSchema({
    name: "Map Values",
    variant: "Pure",
    generateIO({ io }) {
      const w = io.wildcard("");

      return {
        map: io.dataInput({
          id: "map",
          type: t.map(t.wildcard(w)),
        }),
        values: io.dataOutput({
          id: "values",
          type: t.list(t.wildcard(w)),
        }),
      };
    },
    run({ ctx, io }) {
      const map = ctx.getInput(io.map);

      ctx.setOutput(io.values, [...map.values()]);
    },
  });

  pkg.createNonEventSchema({
    name: "Map Size",
    variant: "Pure",
    generateIO({ io }) {
      const w = io.wildcard("");

      return {
        map: io.dataInput({
          id: "map",
          type: t.map(t.wildcard(w)),
        }),
        size: io.dataOutput({
          id: "size",
          type: t.int(),
        }),
      };
    },
    run({ ctx, io }) {
      const map = ctx.getInput(io.map);

      ctx.setOutput(io.size, map.size);
    },
  });

  pkg.createNonEventSchema({
    name: "Map Remove",
    variant: "Exec",
    generateIO({ io }) {
      const w = io.wildcard("");

      return {
        map: io.dataInput({
          id: "map",
          type: t.map(t.wildcard(w)),
        }),
        key: io.dataInput({
          id: "key",
          type: t.string(),
        }),
        out: io.dataOutput({
          id: "out",
          type: t.option(t.wildcard(w)),
        }),
      };
    },
    run({ ctx, io }) {
      const map = ctx.getInput(io.map);
      const key = ctx.getInput(io.key);

      const current = Maybe(map.get(key));

      map.delete(key);

      ctx.setOutput(io.out, current);
    },
  });

  return pkg;
}
