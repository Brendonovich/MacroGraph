import {
	ExecutionContext,
	Package,
	type PropertyDef,
} from "@macrograph/runtime";

const functionProperty = {
	name: "Function",
	source: ({ node }: any) =>
		[...node.graph.project.functions].map(([id, fn]: any) => ({
			id,
			display: fn.name,
		})),
} satisfies PropertyDef;

export function pkg(core: any) {
	const pkg = new Package({
		name: "Functions",
	});

		pkg.createSchema({
			name: "Execute Function",
			type: "exec",
			properties: { function: functionProperty },
			createIO({ io, ctx, properties }: any) {
				const fnId = ctx.getProperty(properties.function);
				if (fnId === undefined) return;
				const fn = ctx.graph.project.functions.get(fnId);
				if (!fn) return;

				return {
					inputs: fn.inputs.map((f: any) =>
						io.dataInput({ id: `in:${f.id}`, name: f.name ?? f.id, type: f.type }),
					),
					outputs: fn.outputs.map((f: any) =>
						io.dataOutput({ id: `out:${f.id}`, name: f.name ?? f.id, type: f.type }),
					),
				};
			},
			async run({ ctx, io, properties, graph }: any) {
				if (!io) return;
				const fnId = ctx.getProperty(properties.function);
				if (fnId === undefined) return;
				const fn = graph.project.functions.get(fnId);
				if (!fn) return;
				const fnGraph = graph.project.graphs.get(fn.graphId);
				if (!fnGraph) return;

				const inNode = [...fnGraph.nodes.values()].find(
					(n: any) => n.schema.name === "Function Input",
				) ?? [...fnGraph.nodes.values()][0];
				if (!inNode) return;

				const execCtx = new ExecutionContext(inNode);

				const scope = new Map<string, any>();
				execCtx.variableScope = scope;
				for (const v of fnGraph.variables ?? []) {
					scope.set(`graph:${v.id}`, v.type.default());
				}

				for (const inp of io.inputs ?? []) {
					const val = ctx.getInput(inp);
					const fieldId = inp.id.replace("in:", "");
					for (const n of fnGraph.nodes.values()) {
						if (n.schema.name !== "Function Input") continue;
						const out = n.state.outputs.find((o: any) => o.id === `gin:${fieldId}`);
						if (out) execCtx.data.set(out, val);
					}
				}

				await execCtx.runAsync({});

				// Read outputs by matching pin nodeId+pinId instead of object reference
				for (const n of fnGraph.nodes.values()) {
					if (n.schema.name !== "Function Output") continue;
					for (const out of io.outputs ?? []) {
						const fieldId = out.id.replace("out:", "");
						const inp = n.state.inputs.find((i: any) => i.id === `gout:${fieldId}`);
						let val: any;
						if (inp) {
							const conn = (inp as any).connection?.toNullable?.();
							if (conn) {
								// Look up by matching output pin node+id
								for (const [k, v] of execCtx.data) {
									if ((k as any).node?.id === (conn as any).node?.id && (k as any).id === (conn as any).id) {
										val = v;
										break;
									}
								}
							}
						}
						if (val === undefined) {
							const inPin = io.inputs?.find((i: any) => i.id === `in:${fieldId}`);
							if (inPin) val = ctx.getInput(inPin);
						}
						if (val !== undefined) ctx.setOutput(out, val);
					}
				}
			},
		});

		pkg.createSchema({
			name: "Function Input",
			type: "base",
			internal: true,
			createIO({ io, ctx }: any) {
				const graph = ctx.graph;
				const fn = [...graph.project.functions].find(
					([, f]: any) => f.graphId === graph.id,
				)?.[1];
				if (!fn) return;

				const exec = io.execOutput({ id: "exec" });
				for (const f of fn.inputs) {
					io.dataOutput({ id: `gin:${f.id}`, name: f.name ?? f.id, type: f.type });
				}
				return { exec };
			},
			async run({ ctx, io }: any) {
				if (!io) return;
				await ctx.exec(io.exec);
			},
		});

		pkg.createSchema({
			name: "Function Output",
			type: "base",
			internal: true,
			createIO({ io, ctx }: any) {
				const graph = ctx.graph;
				const fn = [...graph.project.functions].find(
					([, f]: any) => f.graphId === graph.id,
				)?.[1];
				if (!fn) return;

				io.execInput({ id: "exec" });
				for (const f of fn.outputs) {
					io.dataInput({ id: `gout:${f.id}`, name: f.name ?? f.id, type: f.type });
				}
			},
			run() {},
		});

		return pkg;
}
