import { Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem-old";

export function pkg() {
	const pkg = new Package({ name: "Logic" });

	pkg.createSchema({
		name: "Branch",
		type: "base",
		createIO({ io }) {
			io.execInput({ id: "exec" });

			return {
				condition: io.dataInput({
					id: "condition",
					name: "Condition",
					type: t.bool(),
				}),
				true: io.execOutput({ id: "true", name: "True" }),
				false: io.execOutput({ id: "false", name: "False" }),
			};
		},
		run({ ctx, io }) {
			ctx.exec(ctx.getInput(io.condition) ? io.true : io.false);
		},
	});

	pkg.createSchema({
		name: "Wait",
		type: "exec",
		createIO({ io }) {
			return io.dataInput({ id: "delay", name: "Wait in ms", type: t.int() });
		},
		run({ ctx, io }) {
			return new Promise((res) => setTimeout(res, ctx.getInput(io)));
		},
	});

	pkg.createSchema({
		name: "AND",
		type: "pure",
		createIO({ io }) {
			return {
				one: io.dataInput({ id: "one", type: t.bool() }),
				two: io.dataInput({ id: "two", type: t.bool() }),
				value: io.dataOutput({ id: "value", type: t.bool() }),
			};
		},
		run({ ctx, io }) {
			ctx.setOutput(io.value, ctx.getInput(io.one) && ctx.getInput(io.two));
		},
	});

	pkg.createSchema({
		name: "NAND",
		type: "pure",
		createIO({ io }) {
			return {
				one: io.dataInput({ id: "one", type: t.bool() }),
				two: io.dataInput({ id: "two", type: t.bool() }),
				value: io.dataOutput({ id: "value", type: t.bool() }),
			};
		},
		run({ ctx, io }) {
			ctx.setOutput(io.value, !(ctx.getInput(io.one) && ctx.getInput(io.two)));
		},
	});

	pkg.createSchema({
		name: "OR",
		type: "pure",
		createIO({ io }) {
			return {
				one: io.dataInput({ id: "one", type: t.bool() }),
				two: io.dataInput({ id: "two", type: t.bool() }),
				value: io.dataOutput({ id: "value", type: t.bool() }),
			};
		},
		run({ ctx, io }) {
			ctx.setOutput(io.value, ctx.getInput(io.one) || ctx.getInput(io.two));
		},
	});

	pkg.createSchema({
		name: "NOR",
		type: "pure",
		createIO({ io }) {
			return {
				one: io.dataInput({ id: "one", type: t.bool() }),
				two: io.dataInput({ id: "two", type: t.bool() }),
				value: io.dataOutput({ id: "value", type: t.bool() }),
			};
		},
		run({ ctx, io }) {
			ctx.setOutput(io.value, !(ctx.getInput(io.one) || ctx.getInput(io.two)));
		},
	});

	pkg.createSchema({
		name: "XOR",
		type: "pure",
		createIO({ io }) {
			return {
				one: io.dataInput({ id: "one", type: t.bool() }),
				two: io.dataInput({ id: "two", type: t.bool() }),
				value: io.dataOutput({ id: "value", type: t.bool() }),
			};
		},
		run({ ctx, io }) {
			ctx.setOutput(io.value, ctx.getInput(io.one) !== ctx.getInput(io.two));
		},
	});

	pkg.createSchema({
		name: "NOT",
		type: "pure",
		createIO({ io }) {
			return {
				input: io.dataInput({ id: "input", type: t.bool() }),
				output: io.dataOutput({ id: "output", type: t.bool() }),
			};
		},
		run({ ctx, io }) {
			ctx.setOutput(io.output, !ctx.getInput(io.input));
		},
	});

	pkg.createSchema({
		name: "Conditional",
		type: "pure",
		createIO({ io }) {
			const w = io.wildcard("");

			return {
				condition: io.dataInput({
					id: "condition",
					name: "Condition",
					type: t.bool(),
				}),
				true: io.dataInput({
					id: "trueValue",
					name: "True",
					type: t.wildcard(w),
				}),
				false: io.dataInput({
					id: "falseValue",
					name: "False",
					type: t.wildcard(w),
				}),
				output: io.dataOutput({ id: "output", type: t.wildcard(w) }),
			};
		},
		run({ ctx, io }) {
			ctx.setOutput(
				io.output,
				ctx.getInput(io.condition)
					? ctx.getInput(io.true)
					: ctx.getInput(io.false),
			);
		},
	});

	pkg.createSchema({
		name: "For Each",
		type: "base",
		createIO({ io }) {
			const w = io.wildcard("");

			return {
				exec: io.execInput({ id: "exec" }),
				array: io.dataInput({
					id: "array",
					name: "Array",
					type: t.list(t.wildcard(w)),
				}),
				body: io.scopeOutput({
					id: "body",
					name: "Loop Body",
					scope: (s) => {
						s.output({
							id: "element",
							name: "Array Element",
							type: t.wildcard(w),
						});
						s.output({ id: "index", name: "Array Index", type: t.int() });
					},
				}),
				completed: io.execOutput({ id: "completed", name: "Completed" }),
			};
		},
		async run({ ctx, io }) {
			for (const [index, element] of ctx.getInput(io.array).entries()) {
				await ctx.execScope(io.body, { element, index });
			}

			await ctx.exec(io.completed);
		},
	});

	pkg.createSchema({
		name: "For Loop",
		type: "base",
		createIO({ io }) {
			return {
				exec: io.execInput({ id: "exec" }),
				number: io.dataInput({
					id: "numberOfLoops",
					name: "Times to Loop",
					type: t.int(),
				}),
				body: io.scopeOutput({
					id: "body",
					name: "Loop Body",
					scope: (s) => {
						s.output({ id: "index", name: "Array Index", type: t.int() });
					},
				}),
				completed: io.execOutput({ id: "completed", name: "Completed" }),
			};
		},
		async run({ ctx, io }) {
			for (let x = 0; x < ctx.getInput(io.number); x++) {
				await ctx.execScope(io.body, { index: x });
			}

			await ctx.exec(io.completed);
		},
	});

	pkg.createSchema({
		name: "Switch",
		type: "base",
		properties: { number: { name: "Keys", type: t.int(), default: 1 } },
		createIO({ io, ctx, properties }) {
			const value = ctx.getProperty(properties.number);
			const w = io.wildcard("");

			return {
				exec: io.execInput({ id: "exec" }),
				default: io.execOutput({ id: "exec", name: "Default" }),
				switchOn: io.dataInput({
					id: "switchOn",
					type: t.wildcard(w),
					name: "Data In",
				}),
				switchOut: io.dataOutput({
					id: "switchOut",
					type: t.wildcard(w),
					name: "Data Out",
				}),
				pins: Array.from({ length: value }, (_, i) => ({
					case: io.dataInput({ id: `key-${i}`, type: t.wildcard(w) }),
					exec: io.execOutput({ id: `key-${i}` }),
				})),
			};
		},
		async run({ ctx, io }) {
			const switchData = ctx.getInput(io.switchOn);
			ctx.setOutput(io.switchOut, ctx.getInput(io.switchOn));
			const input = io.pins.find(
				(input) => ctx.getInput(input.case) === switchData,
			);
			await ctx.exec(input === undefined ? io.default : input.exec);
		},
	});

	return pkg;
}
