import { Package, hasConnection, type PropertyDef } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";

const queueProperty = {
	name: "Queue",
	source: ({ node }: any) =>
		[...node.graph.project.queues].map(([id, q]: any) => ({
			id,
			display: q.name,
		})),
} satisfies PropertyDef;

export function pkg(core?: any) {
	const pkg = new Package({
		name: "Queue",
	});

	pkg.createSchema({
		name: "Add to Queue",
		type: "base",
		properties: { queue: queueProperty },
		createIO({ io, ctx, properties }: any) {
			const queueId = ctx.getProperty(properties.queue);
			if (queueId === undefined) return;
			const queue = ctx.graph.project.queues.get(queueId);
			if (!queue) return;

			const execIn = io.execInput({ id: "exec" });

			const inputs = queue.inputs.map((f: any) =>
				io.dataInput({ id: `in:${f.id}`, name: f.name ?? f.id, type: f.type }),
			);

			return {
				execIn,
				execOut: io.execOutput({ id: "exec" }),
				inputs,
			};
		},
		async run({ ctx, io, properties, graph }: any) {
			if (!io) return;
			const queueId = ctx.getProperty(properties.queue);
			if (queueId === undefined) return;
			const queue = graph.project.queues.get(queueId);
			if (!queue) return;

			const data: Record<string, any> = {};
			for (const inp of io.inputs ?? []) {
				const fieldId = inp.id.replace("in:", "");
				data[fieldId] = ctx.getInput(inp);
			}
			queue.addItem(data);

			ctx.exec(io.execOut);
		},
	});

	pkg.createEventSchema({
		name: "Queue Iterated Event",
		event: ({ ctx, properties }: any) => {
			const queueId = ctx.getProperty(properties.queue);
			if (queueId === undefined) return;
			return `iterated:${queueId}`;
		},
		properties: { queue: queueProperty },
		createIO({ io, ctx, properties }: any) {
			const queueId = ctx.getProperty(properties.queue);
			if (queueId === undefined) return;
			const queue = ctx.graph.project.queues.get(queueId);
			if (!queue) return;

			const outputs = queue.outputs.map((f: any) =>
				io.dataOutput({ id: `out:${f.id}`, name: f.name ?? f.id, type: f.type }),
			);

			return {
				exec: io.execOutput({ id: "exec" }),
				outputs,
			};
		},
		run({ ctx, io, data }: any) {
			if (!io) return;
			for (const out of io.outputs ?? []) {
				const fieldId = out.id.replace("out:", "");
				ctx.setOutput(out, data.data?.[fieldId]);
			}
			ctx.exec(io.exec);
		},
	});

	pkg.createSchema({
		name: "Get Queue Paused",
		type: "pure",
		properties: { queue: queueProperty },
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
			const queue = graph.project.queues.get(queueId);
			ctx.setOutput(io, queue ? queue.paused : false);
		},
	});

	pkg.createSchema({
		name: "Set Queue Paused",
		type: "exec",
		properties: { queue: queueProperty },
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
			const queue = graph.project.queues.get(queueId);
			if (!queue) return;

			queue.setPaused(ctx.getInput(io.paused));
		},
	});

	pkg.createSchema({
		name: "Advance Queue",
		type: "exec",
		properties: { queue: queueProperty },
		createIO() {
			return {};
		},
		async run({ ctx, properties, graph, node }: any) {
			const queueId = ctx.getProperty(properties.queue);
			if (queueId === undefined) return;
			const queue = graph.project.queues.get(queueId);
			if (!queue) return;

			queue.advance(node);
		},
	});

	pkg.createSchema({
		name: "Queue Length",
		type: "pure",
		properties: { queue: queueProperty },
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
			const queue = graph.project.queues.get(queueId);
			ctx.setOutput(io, queue ? queue.items.length : 0);
		},
	});

	// --- Internal queue graph nodes ---

	pkg.createSchema({
		name: "Queue Start",
		type: "base",
		internal: true,
		createIO({ io, ctx }: any) {
			const graph = ctx.graph;
			const queue = [...graph.project.queues].find(
				([, q]: any) => q.graphId === graph.id,
			)?.[1];
			if (!queue) return;

			const exec = io.execOutput({ id: "exec" });
			for (const f of queue.inputs) {
				io.dataOutput({ id: `in:${f.id}`, name: f.name ?? f.id, type: f.type });
			}
			return { exec };
		},
		async run({ ctx, io }: any) {
			if (!io) return;
			await ctx.exec(io.exec);
		},
	});

	pkg.createSchema({
		name: "Iterate Queue",
		type: "base",
		internal: true,
		createIO({ io, ctx }: any) {
			const graph = ctx.graph;
			const queue = [...graph.project.queues].find(
				([, q]: any) => q.graphId === graph.id,
			)?.[1];
			if (!queue) return;

			io.execInput({ id: "exec" });
			for (const f of queue.outputs) {
				io.dataInput({ id: `out:${f.id}`, name: f.name ?? f.id, type: f.type });
			}
		},
		async run({ ctx, io, graph }: any) {
			if (!io) return;

			const queue = [...graph.project.queues].find(
				([, q]: any) => q.graphId === graph.id,
			)?.[1];
			if (!queue) return;

			const entryId = ctx.queueEntryId;
			const entryData = entryId
				? queue.getEntryValue(entryId)
				: queue.getActiveItem();
			if (entryId) queue.completeEntry(entryId);
			else queue.completeItem();

			const data: Record<string, any> = {};
			for (const f of queue.outputs) {
				const inputId = `out:${f.id}`;
				const input = io.inputs?.find((i: any) => i.id === inputId);
				if (input && hasConnection(input)) {
					try {
						data[f.id] = ctx.getInput(input);
					} catch {
						data[f.id] = entryData?.[f.id];
					}
				} else {
					data[f.id] = entryData?.[f.id];
				}
			}

			pkg.emitEvent({
				name: `iterated:${queue.id}`,
				data: { queueId: queue.id, data },
			});
		},
	});

	return pkg;
}
