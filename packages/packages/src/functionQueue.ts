import { Package, type PropertyDef } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";

const functionQueueProperty = {
	name: "Function Queue",
	source: ({ node }: any) =>
		[...node.graph.project.functionQueues].map(([id, q]: any) => ({
			id,
			display: q.name,
		})),
} satisfies PropertyDef;

const functionProperty = {
	name: "Function",
	source: ({ node }: any) =>
		[...node.graph.project.functions].map(([id, fn]: any) => ({
			id,
			display: fn.name,
		})),
} satisfies PropertyDef;

export function pkg(core?: any) {
	const pkg = new Package({
		name: "Function Queue",
	});

	pkg.createSchema({
		name: "Add to Function Queue",
		type: "base",
		properties: {
			queue: functionQueueProperty,
			function: functionProperty,
		},
		createIO({ io, ctx, properties }: any) {
			const queueId = ctx.getProperty(properties.queue);
			if (queueId === undefined) return;

			const fnId = ctx.getProperty(properties.function);
			if (fnId === undefined) return;

			const fn = ctx.graph.project.functions.get(fnId);
			if (!fn) return;

			const execIn = io.execInput({ id: "exec" });

			return {
				execIn,
				execOut: io.execOutput({ id: "exec" }),
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

			const queueId = ctx.getProperty(properties.queue);
			if (queueId === undefined) return;

			const fnId = ctx.getProperty(properties.function);
			if (fnId === undefined) return;

			const queue = graph.project.functionQueues.get(queueId);
			if (!queue) return;

			const data: Record<string, any> = {};
			for (const inp of io.inputs ?? []) {
				const fieldId = inp.id.replace("in:", "");
				data[fieldId] = ctx.getInput(inp);
			}

			const outputs = await queue.addItem({
				functionId: fnId,
				data,
				waitingNodeId: io.execIn.node.id,
				waitingGraphId: graph.id,
			});

			for (const out of io.outputs ?? []) {
				const fieldId = out.id.replace("out:", "");
				if (outputs[fieldId] !== undefined) {
					ctx.setOutput(out, outputs[fieldId]);
				}
			}

			ctx.exec(io.execOut);
		},
	});

	pkg.createEventSchema({
		name: "Function Queue Iterated Event",
		event: ({ ctx, properties }: any) => {
			const queueId = ctx.getProperty(properties.queue);
			if (queueId === undefined) return;
			return `fnIterated:${queueId}`;
		},
		properties: { queue: functionQueueProperty },
		createIO({ io }: any) {
			return {
				exec: io.execOutput({ id: "exec" }),
			};
		},
		run({ ctx, io, data }: any) {
			if (!io) return;
			ctx.exec(io.exec);
		},
	});

	pkg.createSchema({
		name: "Get Function Queue Paused",
		type: "pure",
		properties: { queue: functionQueueProperty },
		createIO({ io }: any) {
			return io.dataOutput({
				id: "",
				name: "Paused",
				type: t.bool(),
			});
		},
		run({ ctx, io, properties, graph }: any) {
			if (!io) return;
			const queueId = ctx.getProperty(properties.queue);
			if (queueId === undefined) return;
			const queue = graph.project.functionQueues.get(queueId);
			ctx.setOutput(io, queue ? queue.paused : false);
		},
	});

	pkg.createSchema({
		name: "Set Function Queue Paused",
		type: "exec",
		properties: { queue: functionQueueProperty },
		createIO({ io }: any) {
			return {
				paused: io.dataInput({
					id: "paused",
					name: "Paused",
					type: t.bool(),
				}),
			};
		},
		async run({ ctx, io, properties, graph }: any) {
			if (!io) return;
			const queueId = ctx.getProperty(properties.queue);
			if (queueId === undefined) return;
			const queue = graph.project.functionQueues.get(queueId);
			if (!queue) return;

			queue.setPaused(ctx.getInput(io.paused));
		},
	});

	pkg.createSchema({
		name: "Function Queue Length",
		type: "pure",
		properties: { queue: functionQueueProperty },
		createIO({ io }: any) {
			return io.dataOutput({
				id: "",
				name: "Length",
				type: t.int(),
			});
		},
		run({ ctx, io, properties, graph }: any) {
			if (!io) return;
			const queueId = ctx.getProperty(properties.queue);
			if (queueId === undefined) return;
			const queue = graph.project.functionQueues.get(queueId);
			ctx.setOutput(io, queue ? queue.items.length : 0);
		},
	});

	return pkg;
}
