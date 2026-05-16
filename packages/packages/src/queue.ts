import { Package, type PropertyDef } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";

const projectQueues = (graph: { project: { queues: any[] } }) =>
	graph.project.queues;

export function pkg() {
	const pkg = new Package({
		name: "Queue",
	});

	const queueProperty = {
		name: "Queue",
		source: ({ node }) =>
			projectQueues(node.graph).map((q: any) => ({
				id: q.id,
				display: q.name,
			})),
	} satisfies PropertyDef;

	const positionProperty = {
		name: "Position",
		source: () =>
			["End", "Front", "At Index"].map((p) => ({
				id: p,
				display: p,
			})),
	} satisfies PropertyDef;

	pkg.createSchema({
		name: "Add to Queue",
		type: "exec",
		properties: {
			queue: queueProperty,
			position: positionProperty,
		},
		createIO({ io, ctx, properties }) {
			const queueId = ctx.getProperty(properties.queue);
			const queue = projectQueues(ctx.graph).find(
				(q: any) => q.id === queueId,
			);
			if (!queue) return;

			const position = ctx.getProperty(properties.position) ?? "End";

			const inputs: any = {
				value: io.dataInput({
					id: "value",
					name: "Value",
					type: queue.itemType,
				}),
			};

			if (position === "At Index") {
				inputs.index = io.dataInput({
					id: "index",
					name: "Index",
					type: t.int(),
				});
			}

			return inputs;
		},
		async run({ ctx, io, properties }) {
			if (!io) return;

			const queueId = ctx.getProperty(properties.queue);
			if (queueId === undefined) return;

			const queue = ctx.graph.project.queues.find((q) => q.id === queueId);
			if (!queue) return;

			const position = ctx.getProperty(properties.position) ?? "End";
			const value = ctx.getInput(io.value);

			switch (position) {
				case "End":
					queue.value = [...queue.value, value];
					break;
				case "Front":
					queue.value = [value, ...queue.value];
					break;
				case "At Index": {
					const list = [...queue.value];
					list.splice(ctx.getInput(io.index), 0, value);
					queue.value = list;
					break;
				}
			}
		},
	});

	pkg.createSchema({
		name: "Get Queue Item",
		type: "base",
		properties: {
			queue: queueProperty,
		},
		createIO({ io, ctx, properties }) {
			const queueId = ctx.getProperty(properties.queue);
			const queue = projectQueues(ctx.graph).find(
				(q: any) => q.id === queueId,
			);
			if (!queue) return;

			return {
				exec: io.execInput({
					id: "exec",
				}),
				index: io.dataInput({
					id: "index",
					name: "Index",
					type: t.int(),
				}),
				gotItem: io.scopeOutput({
					id: "gotItem",
					name: "Got Item",
					scope: (s) => {
						s.output({
							id: "value",
							name: "Value",
							type: queue.itemType,
						});
					},
				}),
				empty: io.execOutput({
					id: "empty",
					name: "Empty",
				}),
			};
		},
		async run({ ctx, io, properties }) {
			if (!io) return;

			const queueId = ctx.getProperty(properties.queue);
			if (queueId === undefined) return;

			const queue = ctx.graph.project.queues.find((q) => q.id === queueId);
			if (!queue) return;

			const index = ctx.getInput(io.index);
			const item =
				index >= 0 && index < queue.value.length
					? queue.value.splice(index, 1)[0]
					: undefined;

			if (item !== undefined) {
				await ctx.execScope(io.gotItem, { value: item });
			} else {
				await ctx.exec(io.empty);
			}
		},
	});

	pkg.createSchema({
		name: "Queue Length",
		type: "pure",
		properties: {
			queue: queueProperty,
		},
		createIO({ io, ctx, properties }) {
			const queueId = ctx.getProperty(properties.queue);
			const queue = projectQueues(ctx.graph).find(
				(q: any) => q.id === queueId,
			);
			if (!queue) return;

			return io.dataOutput({
				id: "",
				name: "Length",
				type: t.int(),
			});
		},
		run({ ctx, io, properties }) {
			if (!io) return;

			const queueId = ctx.getProperty(properties.queue);
			if (queueId === undefined) return;

			const queue = ctx.graph.project.queues.find((q) => q.id === queueId);
			ctx.setOutput(io, queue ? queue.value.length : 0);
		},
	});

	return pkg;
}
