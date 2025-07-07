import { Option, Schema } from "effect";
import * as Effect from "effect/Effect";

import {
  getInput,
  Package,
  PackageEngine,
  setOutput,
} from "@macrograph/package-sdk";

const Engine = PackageEngine.make<never>()<number>(
  Effect.fn(function* (ctx) {
    let i = 0;

    yield* Effect.forkScoped(
      Effect.forever(
        Effect.sync(() => ctx.emitEvent(i++)).pipe(Effect.delay("1 second")),
      ),
    );

    return {};
  }),
);

export default Package.make({
  engine: Engine,
  builder: (ctx) => {
    ctx.schema("print", {
      name: "Print",
      type: "exec",
      io: (c) => ({
        execIn: c.in.exec("exec"),
        execOut: c.out.exec("exec"),
        in: c.in.data("in", Schema.String),
      }),
      run: function* (io) {
        console.log(`Log: ${yield* getInput(io.in)}`);
        // const logger = yield* Logger;
        // yield* logger.print(`Log: ${yield* getInput(io.in)}`);

        return io.execOut;
      },
    });

    ctx.schema("ticker", {
      name: "Ticker",
      type: "event",
      event: Option.some,
      io: (c) => ({
        execOut: c.out.exec("exec"),
        tick: c.out.data("tick", Schema.Int),
      }),
      run: function* (io, data) {
        yield* setOutput(io.tick, data);

        return io.execOut;
      },
    });

    ctx.schema("intToString", {
      type: "pure",
      io: (c) => ({
        int: c.in.data("int", Schema.Int),
        str: c.out.data("str", Schema.String),
      }),
      run: function* (io) {
        yield* setOutput(io.str, String(yield* getInput(io.int)));
      },
    });
  },
});
