import { Maybe, None, Some } from "@macrograph/option";
import { Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";

import { jsToJSON, jsonToJS, toJSON } from "./conversion";
import { JSONEnum } from "./type";

export function pkg() {
	const pkg = new Package({
		name: "JSON",
		ctx: {},
	});

	pkg.registerType(JSONEnum);

	pkg.createSchema({
		name: "To JSON",
		type: "pure",
		createIO({ io }) {
			const w = io.wildcard("");

			return {
				w,
				in: io.dataInput({
					id: "in",
					type: t.wildcard(w),
				}),
				out: io.dataOutput({
					id: "out",
					type: t.enum(JSONEnum),
				}),
			};
		},
		run({ ctx, io }) {
			const val = Maybe(toJSON(io.in.type, ctx.getInput(io.in)));
			ctx.setOutput(
				io.out,
				val.expect(
					`Type ${io.w.toString()} cannot be converted to JSON!`,
				) as any,
			);
		},
	});

	pkg.createSchema({
		name: "From JSON",
		type: "pure",
		createIO({ io }) {
			const w = io.wildcard("");
			return {
				w,
				in: io.dataInput({
					id: "in",
					type: t.enum(JSONEnum),
				}),
				out: io.dataOutput({
					id: "out",
					type: t.wildcard(w),
				}),
			};
		},
		run({ ctx, io }) {
			const json = ctx.getInput(io.in);
			ctx.setOutput(io.out, jsonToJS(json, io.w.value().unwrap()));
		},
	});

	pkg.createSchema({
		name: "Parse JSON",
		type: "exec",
		createIO({ io }) {
			return {
				in: io.dataInput({
					id: "in",
					type: t.string(),
				}),
				out: io.dataOutput({
					id: "out",
					type: t.enum(JSONEnum),
				}),
			};
		},
		run({ ctx, io }) {
			const value = jsToJSON(JSON.parse(ctx.getInput(io.in)));
			ctx.setOutput(io.out, Maybe(value).expect("Failed to parse JSON!"));
		},
	});

	pkg.createSchema({
		name: "Query JSON",
		type: "exec",
		properties: {
			query: {
				name: "Query",
				type: t.string(),
			},
		},
		createIO({ io }) {
			return {
				in: io.dataInput({
					id: "in",
					type: t.enum(JSONEnum),
				}),
				out: io.dataOutput({
					id: "out",
					type: t.option(t.enum(JSONEnum)),
				}),
			};
		},
		run({ ctx, io, properties }) {
			// TODO: remove jsonToJS from this
			const value = jsonToJS(ctx.getInput(io.in));
			let query = ctx.getProperty(properties.query);
			let output: { [x: string]: any } | null = null;
			if (query[0] === ".") {
				query = query.slice(1);
				output = value;
				const keys = query.split(".");
				for (const key of keys) {
					if (output !== null && output[key] !== undefined) {
						output = output[key];
					} else {
						output = null;
					}
				}
			}

			ctx.setOutput(io.out, Maybe(jsToJSON(output)));
		},
	});

	pkg.createSchema({
		name: "JSON Get String",
		type: "pure",
		createIO({ io }) {
			return {
				in: io.dataInput({
					id: "in",
					type: t.enum(JSONEnum),
				}),
				out: io.dataOutput({
					id: "out",
					type: t.option(t.string()),
				}),
			};
		},
		run({ ctx, io }) {
			const input = ctx.getInput(io.in);

			ctx.setOutput(
				io.out,
				input.variant === "String" ? Some(jsonToJS(input)) : None,
			);
		},
	});

	pkg.createSchema({
		name: "JSON Get Number",
		type: "pure",
		createIO({ io }) {
			return {
				in: io.dataInput({
					id: "in",
					type: t.enum(JSONEnum),
				}),
				out: io.dataOutput({
					id: "out",
					type: t.option(t.float()),
				}),
			};
		},
		run({ ctx, io }) {
			const input = ctx.getInput(io.in);

			ctx.setOutput(
				io.out,
				input.variant === "Number" ? Some(jsonToJS(input)) : None,
			);
		},
	});

	pkg.createSchema({
		name: "JSON Get Boolean",
		type: "pure",
		createIO({ io }) {
			return {
				in: io.dataInput({
					id: "in",
					type: t.enum(JSONEnum),
				}),
				out: io.dataOutput({
					id: "out",
					type: t.option(t.bool()),
				}),
			};
		},
		run({ ctx, io }) {
			const input = ctx.getInput(io.in);

			ctx.setOutput(
				io.out,
				input.variant === "Bool" ? Some(jsonToJS(input)) : None,
			);
		},
	});

	pkg.createSchema({
		name: "JSON Get List",
		type: "pure",
		createIO({ io }) {
			return {
				in: io.dataInput({
					id: "in",
					type: t.enum(JSONEnum),
				}),
				out: io.dataOutput({
					id: "out",
					type: t.option(t.list(t.enum(JSONEnum))),
				}),
			};
		},
		run({ ctx, io }) {
			const input = ctx.getInput(io.in);

			ctx.setOutput(
				io.out,
				input.variant === "List" ? Some(input.data.value) : None,
			);
		},
	});

	pkg.createSchema({
		name: "JSON Get Map",
		type: "pure",
		createIO({ io }) {
			return {
				in: io.dataInput({
					id: "in",
					type: t.enum(JSONEnum),
				}),
				out: io.dataOutput({
					id: "out",
					type: t.option(t.map(t.enum(JSONEnum))),
				}),
			};
		},
		run({ ctx, io }) {
			const input = ctx.getInput(io.in) as any;

			ctx.setOutput(
				io.out,
				input.variant === "Map" ? Some(input.data.value) : None,
			);
		},
	});

	return pkg;
}
