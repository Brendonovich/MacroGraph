import { JSONEnum, jsonToJS, jsToJSON } from "@macrograph/json";
import { Maybe } from "@macrograph/option";
import { Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem-old";

export function pkg() {
	const pkg = new Package({ name: "Localstorage" });

	pkg.createSchema({
		name: "Set Data",
		type: "exec",
		createIO: ({ io }) => {
			return {
				key: io.dataInput({ id: "key", name: "Key", type: t.string() }),
				value: io.dataInput({ id: "value", name: "Value", type: t.string() }),
			};
		},
		run({ ctx, io }) {
			localStorage.setItem(
				`value-${ctx.getInput(io.key)}`,
				ctx.getInput(io.value),
			);
		},
	});

	pkg.createSchema({
		name: "Set JSON Data",
		type: "exec",
		createIO: ({ io }) => {
			return {
				key: io.dataInput({ id: "key", name: "Key", type: t.string() }),
				value: io.dataInput({
					id: "value",
					name: "Value",
					type: t.enum(JSONEnum),
				}),
			};
		},
		run({ ctx, io }) {
			localStorage.setItem(
				`value-${ctx.getInput(io.key)}`,
				window.JSON.stringify(jsonToJS(ctx.getInput(io.value))),
			);
		},
	});

	pkg.createSchema({
		name: "Get Data",
		type: "pure",
		createIO: ({ io }) => {
			return {
				key: io.dataInput({ id: "key", name: "Key", type: t.string() }),
				output: io.dataOutput({
					id: "output",
					name: "Data",
					type: t.option(t.string()),
				}),
			};
		},
		run({ ctx, io }) {
			const data = localStorage.getItem(`value-${ctx.getInput(io.key)}`);
			const opt = Maybe(data);
			ctx.setOutput(io.output, opt);
		},
	});

	pkg.createSchema({
		name: "Get JSON Data",
		type: "pure",
		createIO: ({ io }) => {
			return {
				key: io.dataInput({ id: "key", name: "Key", type: t.string() }),
				output: io.dataOutput({
					id: "output",
					name: "Data",
					type: t.enum(JSONEnum),
				}),
			};
		},
		run({ ctx, io }) {
			ctx.setOutput(
				io.output,
				Maybe(localStorage.getItem(`value-${ctx.getInput(io.key)}`))
					.map(window.JSON.parse)
					.andThen((parsed) => Maybe(jsToJSON(parsed)))
					.unwrap(),
			);
		},
	});

	pkg.createSchema({
		name: "Remove Data",
		type: "exec",
		createIO: ({ io }) => {
			return io.dataInput({ id: "key", name: "Key", type: t.string() });
		},
		run({ ctx, io }) {
			localStorage.removeItem(`value-${ctx.getInput(io)}`);
		},
	});

	return pkg;
}
