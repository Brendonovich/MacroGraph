import { Package, type PropertyDef } from "@macrograph/runtime";
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

			return {
				execIn,
				execOut: io.execOutput({ id: "exec" }),
				value: io.dataInput({
					id: "value",
					name: "Value",
					type: queue.itemType,
				}),
			};
		},
		async run({ ctx, io, properties, graph }: any) {
			if (!io) return;
			const queueId = ctx.getProperty(properties.queue);
			if (queueId === undefined) return;
			const queue = graph.project.queues.get(queueId);
			if (!queue) return;

			const value = ctx.getInput(io.value);
			queue.addItem(value);

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

			return {
				exec: io.execOutput({ id: "exec" }),
				item: io.dataOutput({
					id: "item",
					name: "Item",
					type: queue.itemType,
				}),
			};
		},
		run({ ctx, io, data }: any) {
			if (!io) return;
			ctx.setOutput(io.item, data.item);
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
			io.dataOutput({
				id: "item",
				name: "Current Item",
				type: queue.itemType,
			});
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

			return {
				exec: io.execInput({ id: "exec" }),
				item: io.dataInput({
					id: "item",
					name: "Item",
					type: queue.itemType,
				}),
			};
		},
		async run({ ctx, io, graph }: any) {
			if (!io) return;

			const queue = [...graph.project.queues].find(
				([, q]: any) => q.graphId === graph.id,
			)?.[1];
			if (!queue) return;

			const item = ctx.getInput(io.item);

			queue.completeItem(item);

			pkg.emitEvent({
				name: `iterated:${queue.id}`,
				data: { queueId: queue.id, item },
			});
		},
	});

	return pkg;
}
