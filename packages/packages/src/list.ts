import { Maybe } from "@macrograph/option";
import { Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem-old";

export function pkg() {
	const pkg = new Package({ name: "List" });

	pkg.createSchema({
		name: "List Create",
		type: "pure",
		properties: { number: { name: "Entries", type: t.int(), default: 1 } },
		createIO({ io, ctx, properties }) {
			const value = ctx.getProperty(properties.number);
			const w = io.wildcard("");
			const inputs = Array.from({ length: value }, (_, i) => ({
				value: io.dataInput({ id: `value-${i}`, type: t.wildcard(w) }),
			}));

			return {
				inputs,
				out: io.dataOutput({ id: "", type: t.list(t.wildcard(w)) }),
			};
		},
		run({ ctx, io }) {
			const array: any[] = [];
			for (const input of io.inputs) {
				array.push(ctx.getInput(input.value));
			}

			ctx.setOutput(io.out, array);
		},
	});

	pkg.createSchema({
		name: "Push List Value",
		type: "exec",
		createIO({ io }) {
			const w = io.wildcard("");

			return {
				list: io.dataInput({ id: "list", type: t.list(t.wildcard(w)) }),
				value: io.dataInput({ id: "value", type: t.wildcard(w) }),
				outList: io.dataOutput({ id: "outList", type: t.list(t.wildcard(w)) }),
			};
		},
		run({ ctx, io }) {
			const list = [...ctx.getInput(io.list)];

			list.push(ctx.getInput(io.value));

			ctx.setOutput(io.outList, list);
		},
	});

	pkg.createSchema({
		name: "Insert List Value",
		type: "exec",
		createIO({ io }) {
			const w = io.wildcard("");

			return {
				list: io.dataInput({ id: "list", type: t.list(t.wildcard(w)) }),
				index: io.dataInput({ id: "index", type: t.int() }),
				value: io.dataInput({ id: "value", type: t.wildcard(w) }),
				outList: io.dataOutput({ id: "outList", type: t.list(t.wildcard(w)) }),
			};
		},
		run({ ctx, io }) {
			const list = [...ctx.getInput(io.list)];

			list.splice(ctx.getInput(io.index), 0, ctx.getInput(io.value));

			ctx.setOutput(io.outList, list);
		},
	});

	pkg.createSchema({
		name: "Set List Value",
		type: "exec",
		createIO({ io }) {
			const w = io.wildcard("");

			return {
				list: io.dataInput({ id: "list", type: t.list(t.wildcard(w)) }),
				index: io.dataInput({ id: "index", type: t.int() }),
				value: io.dataInput({ id: "value", type: t.wildcard(w) }),
				outList: io.dataOutput({ id: "outList", type: t.list(t.wildcard(w)) }),
			};
		},
		run({ ctx, io }) {
			const list = [...ctx.getInput(io.list)];
			list.splice(ctx.getInput(io.index), 1, ctx.getInput(io.value));
			ctx.setOutput(io.outList, list);
		},
	});

	pkg.createSchema({
		name: "Remove List Value",
		type: "exec",
		createIO({ io }) {
			const w = io.wildcard("");

			return {
				list: io.dataInput({ id: "list", type: t.list(t.wildcard(w)) }),
				index: io.dataInput({ id: "index", type: t.int() }),
				returnList: io.dataOutput({
					id: "returnList",
					type: t.list(t.wildcard(w)),
				}),
				returnValue: io.dataOutput({
					id: "returnValue",
					type: t.option(t.wildcard(w)),
				}),
			};
		},
		run({ ctx, io }) {
			const list = [...ctx.getInput(io.list)];

			const value = list.splice(ctx.getInput(io.index), 1)[0];

			ctx.setOutput(io.returnList, list);

			ctx.setOutput(io.returnValue, Maybe(value));
		},
	});

	pkg.createSchema({
		name: "Get List Value",
		type: "pure",
		createIO({ io }) {
			const w = io.wildcard("");

			return {
				list: io.dataInput({ id: "list", type: t.list(t.wildcard(w)) }),
				index: io.dataInput({ id: "index", type: t.int() }),
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
				Maybe(array[index < 0 ? array.length + index : index]),
			);
		},
	});

	pkg.createSchema({
		name: "Join String List",
		type: "pure",
		createIO({ io }) {
			return {
				input: io.dataInput({ id: "input", type: t.list(t.string()) }),
				separator: io.dataInput({
					id: "separator",
					name: "Separator",
					type: t.string(),
				}),
				output: io.dataOutput({ id: "output", type: t.string() }),
			};
		},
		run({ ctx, io }) {
			ctx.setOutput(
				io.output,
				ctx.getInput(io.input).join(ctx.getInput(io.separator)),
			);
		},
	});

	return pkg;
}
