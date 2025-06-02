import { Console, Schema } from "effect";
import * as Effect from "effect/Effect";

import { definePackage, PackageEngine } from "../package";
import { getInput, setOutput } from "../package-utils";
import { Logger } from "../Runtime";

export default definePackage(
  Effect.fn(function* (pkg) {
    const tick = pkg.event("tick", Schema.Number);

    yield* pkg.schema("print", {
      name: "Print",
      type: "exec",
      io: (c) => ({
        execIn: c.in.exec("exec"),
        execOut: c.out.exec("exec"),
        in: c.in.data("in", Schema.String),
      }),
      run: function* (io) {
        const logger = yield* Logger;
        yield* logger.print(`Log: ${yield* getInput(io.in)}`);

        return io.execOut;
      },
    });

    yield* pkg.schema("ticker", {
      name: "Ticker",
      type: "event",
      event: tick,
      io: (c) => ({
        execOut: c.out.exec("exec"),
        tick: c.out.data("tick", Schema.Int),
      }),
      run: function* (io, data) {
        yield* setOutput(io.tick, data);

        return io.execOut;
      },
    });

    yield* pkg.schema("intToString", {
      type: "pure",
      io: (c) => ({
        int: c.in.data("int", Schema.Int),
        str: c.out.data("str", Schema.String),
      }),
      run: function* (io) {
        yield* setOutput(io.str, String(yield* getInput(io.int)));
      },
    });

    return {
      engine: Effect.gen(function* () {
        let i = 0;
        while (true) {
          yield* PackageEngine.emit(tick, i++);
          yield* Effect.sleep(1000);
        }
      }),
    };
  }),
);
