import * as Effect from "effect/Effect";
import { getInput, Package, setOutput, t } from "@macrograph/package-sdk";

// const Engine = PackageEngine.define<never>()({
// 	events: Schema.Number,
// }).build((ctx) => {
// 	let i = 0;

// 	Effect.forever(
// 		Effect.sync(() => ctx.emitEvent(i++)).pipe(Effect.delay("1 second")),
// 	).pipe(Effect.runPromise);

// 	return {};
// });

export default Package.make({
	name: "Utilities",
	// engine: Engine,
	builder: (ctx) => {
		ctx.schema("print", {
			name: "Print",
			type: "exec",
			io: (c) => ({
				in: c.in.data("in", t.String, {
					name: "Input",
				}),
			}),
			run: function* ({ io }) {
				yield* Effect.log(`Log: ${yield* getInput(io.in)}`);
				// const logger = yield* Logger;
				// yield* logger.print(`Log: ${yield* getInput(io.in)}`);
			},
		});

		ctx.schema("concat-strings", {
			name: "Concat Strings",
			type: "pure",
			io: (c) => ({
				str1: c.in.data("str1", t.String),
				str2: c.in.data("str2", t.String),
				result: c.out.data("result", t.String),
			}),
			run: function* ({ io }) {
				yield* setOutput(
					io.result,
					(yield* getInput(io.str1)) + (yield* getInput(io.str2)),
				);
			},
		});

		// ctx.schema("ticker", {
		// 	name: "Ticker",
		// 	variant: "Event",
		// 	event: (_, e) => e,
		// 	io: (c) => ({
		// 		execOut: c.out.exec("exec"),
		// 		tick: c.out.data("tick", Schema.Int),
		// 	}),
		// 	run: function* ({ io }, data) {
		// 		yield* setOutput(io.tick, data);

		// 		return io.execOut;
		// 	},
		// });

		ctx.schema("intToString", {
			name: "Int To String",
			type: "pure",
			io: (c) => ({
				int: c.in.data("int", t.Int),
				str: c.out.data("str", t.String),
			}),
			run: function* ({ io }) {
				yield* setOutput(io.str, String(yield* getInput(io.int)));
			},
		});
	},
});
