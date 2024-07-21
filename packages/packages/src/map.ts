import { JSONEnum, toJSON } from "@macrograph/json";
import { Maybe } from "@macrograph/option";
import { Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { ReactiveMap } from "@solid-primitives/map";

export function pkg() {
	const pkg = new Package({
		name: "Map",
	});

	pkg.createSchema({
		name: "Map Get",
		type: "pure",
		properties: {
			number: {
				name: "Keys",
				type: t.int(),
				default: 1,
			},
		},
		createIO({ io, ctx, properties }) {
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
				pins: Array.from({ length: value }, (_, i) => ({
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
			for (const input of io.pins) {
				ctx.setOutput(input.value, Maybe(map.get(ctx.getInput(input.key))));
			}
		},
	});

	pkg.createSchema({
		name: "Map Insert",
		type: "exec",
		properties: {
			number: {
				name: "Entries",
				type: t.int(),
				default: 1,
			},
		},
		createIO({ io, ctx, properties }) {
			const w = io.wildcard("");
			const value = ctx.getProperty(properties.number);

			return {
				mapIn: io.dataInput({
					id: "map",
					type: t.map(t.wildcard(w)),
				}),
				mapOut: io.dataOutput({
					id: "map",
					type: t.map(t.wildcard(w)),
				}),
				pins: Array.from({ length: value }, (_, i) => ({
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
			const map = ctx.getInput(io.mapIn);
			for (const input of io.pins) {
				map.set(ctx.getInput(input.key), ctx.getInput(input.value));
				ctx.setOutput(input.current, Maybe(map.get(ctx.getInput(input.key))));
			}
			ctx.setOutput(io.mapOut, map);
		},
	});

	pkg.createSchema({
		name: "Map Create",
		type: "pure",
		properties: {
			number: {
				name: "Entries",
				type: t.int(),
				default: 1,
			},
		},
		createIO({ io, ctx, properties }) {
			const value = ctx.getProperty(properties.number);
			const w = io.wildcard("");
			const inputs = Array.from({ length: value }, (_, i) => ({
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
			const map = new ReactiveMap<string, any>();

			for (const input of io.inputs) {
				map.set(ctx.getInput(input.key), ctx.getInput(input.value));
			}

			ctx.setOutput(io.out, map);
		},
	});

	pkg.createSchema({
		name: "JSON Map Create",
		type: "pure",
		properties: {
			number: {
				name: "Entries",
				type: t.int(),
				default: 1,
			},
		},
		createIO({ io, ctx, properties }) {
			const value = ctx.getProperty(properties.number);

			const inputs = Array.from({ length: value }, (_, i) => ({
				key: io.dataInput({
					id: `key-${i}`,
					type: t.string(),
				}),
				value: io.dataInput({
					id: `value-${i}`,
					type: t.wildcard(io.wildcard(`${i}`)),
				}),
			}));

			return {
				inputs,
				out: io.dataOutput({
					id: "",
					type: t.map(t.enum(JSONEnum)),
				}),
			};
		},
		run({ ctx, io }) {
			const map = new ReactiveMap<string, any>();

			for (const input of io.inputs) {
				map.set(
					ctx.getInput(input.key),
					toJSON(input.value.type, ctx.getInput(input.value)),
				);
			}

			ctx.setOutput(io.out, map);
		},
	});

	pkg.createSchema({
		name: "Map Clear",
		type: "exec",
		createIO({ io }) {
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

	pkg.createSchema({
		name: "Map Contains",
		type: "pure",
		createIO({ io }) {
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

	pkg.createSchema({
		name: "Map Keys",
		type: "pure",
		createIO({ io }) {
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

	pkg.createSchema({
		name: "Map Values",
		type: "pure",
		createIO({ io }) {
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

	pkg.createSchema({
		name: "Map Size",
		type: "pure",
		createIO({ io }) {
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

	pkg.createSchema({
		name: "Map Remove",
		type: "exec",
		createIO({ io }) {
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
