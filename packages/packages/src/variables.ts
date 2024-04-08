import { Package, PropertyDef } from "@macrograph/runtime";
import { ReactiveSet } from "@solid-primitives/set";
import { createEffect, createMemo, on, onCleanup, untrack } from "solid-js";

type Events = {
	[key: `${number}:${number}`]: { variableId: number; value: any };
};

export function pkg() {
	const pkg = new Package<Events>({
		name: "Variables",
	});

	const graphVariableProperty = {
		name: "Variable",
		source: ({ node }) =>
			node.graph.variables.map((v) => ({
				id: v.id,
				display: v.name,
			})),
	} satisfies PropertyDef;

	pkg.createNonEventSchema({
		name: "Get Graph Variable",
		variant: "Pure",
		properties: {
			variable: graphVariableProperty,
		},
		createIO({ io, ctx, properties }) {
			const variableId = ctx.getProperty(properties.variable);
			const variable = ctx.graph.variables.find((v) => v.id === variableId);
			if (!variable) return;

			return io.dataOutput({
				id: "",
				name: variable.name,
				type: variable.type,
			});
		},
		run({ ctx, io, properties, graph }) {
			if (!io) return;

			const variableId = ctx.getProperty(properties.variable);
			const variable = graph.variables.find(
				(v) => v.id === Number(variableId),
			)!;

			ctx.setOutput(io, variable.value);
		},
	});

	pkg.createNonEventSchema({
		name: "Set Graph Variable",
		variant: "Exec",
		properties: {
			variable: graphVariableProperty,
		},
		createIO({ io, ctx, properties }) {
			const variableId = ctx.getProperty(properties.variable);
			const variable = ctx.graph.variables.find((v) => v.id === variableId);
			if (!variable) return;

			return io.dataInput({
				id: "",
				name: variable.name,
				type: variable.type,
			});
		},
		run({ ctx, io, properties, graph }) {
			if (!io) return;

			const variableId = ctx.getProperty(properties.variable);
			const variable = graph.variables.find((v) => v.id === variableId);
			if (!variable) return;

			variable.value = ctx.getInput(io);
		},
	});

	const projectVariableProperty = {
		name: "Variable",
		source: ({ node }) =>
			node.graph.project.variables.map((v) => ({
				id: v.id,
				display: v.name,
			})),
	} satisfies PropertyDef;

	pkg.createNonEventSchema({
		name: "Get Project Variable",
		variant: "Pure",
		properties: {
			variable: projectVariableProperty,
		},
		createIO({ io, ctx, properties }) {
			const variableId = ctx.getProperty(properties.variable);
			const variable = ctx.graph.project.variables.find(
				(v) => v.id === variableId,
			);
			if (!variable) return;

			return io.dataOutput({
				id: "",
				name: variable.name,
				type: variable.type,
			});
		},
		run({ ctx, io, properties, graph }) {
			if (!io) return;

			const variableId = ctx.getProperty(properties.variable);
			const variable = graph.project.variables.find(
				(v) => v.id === Number(variableId),
			)!;

			ctx.setOutput(io, variable.value);
		},
	});

	pkg.createNonEventSchema({
		name: "Set Project Variable",
		variant: "Exec",
		properties: {
			variable: projectVariableProperty,
		},
		createIO({ io, ctx, properties }) {
			const variableId = ctx.getProperty(properties.variable);
			const variable = ctx.graph.project.variables.find(
				(v) => v.id === variableId,
			);
			if (!variable) return;

			return io.dataInput({
				id: "",
				name: variable.name,
				type: variable.type,
			});
		},
		run({ ctx, io, properties, graph }) {
			if (!io) return;

			const variableId = ctx.getProperty(properties.variable);
			const variable = graph.project.variables.find((v) => v.id === variableId);
			if (!variable) return;

			variable.value = ctx.getInput(io);
		},
	});

	const listenedVariables = new ReactiveSet<`${number}:${number}`>();

	pkg.createEventSchema({
		event: ({ ctx, properties }) => {
			const variableId = ctx.getProperty(properties.variable);
			const variable = ctx.graph.variables.find((v) => v.id === variableId);
			if (!variable) return;

			return `${ctx.graph.id}:${variable.id}`;
		},
		name: "Graph Variable Changed",
		properties: { variable: graphVariableProperty },
		createIO({ io, ctx, properties, graph }) {
			const variableId = ctx.getProperty(properties.variable);
			const variable = ctx.graph.variables.find((v) => v.id === variableId);
			if (!variable) return;

			const hasListener = createMemo(() =>
				listenedVariables.has(`${graph.id}:${variable.id}`),
			);

			if (untrack(hasListener)) hasListener();
			else {
				listenedVariables.add(`${graph.id}:${variable.id}`);

				let firstRun = false;

				createEffect(
					on(
						() => variable.value,
						(value) => {
							if (!firstRun) {
								firstRun = true;
								return;
							}

							pkg.emitEvent({
								name: `${graph.id}:${variable.id}`,
								data: { variableId: variable.id, value },
							});
						},
					),
				);

				onCleanup(() => {
					listenedVariables.delete(`${graph.id}:${variable.id}`);
				});
			}

			return {
				variable,
				exec: io.execOutput({
					id: "exec",
				}),
				output: io.dataOutput({
					id: "output",
					name: variable.name,
					type: variable.type,
				}),
			};
		},
		run({ ctx, data, io }) {
			if (!io || data.variableId !== io.variable.id) return;

			ctx.setOutput(io.output, data.value);
			ctx.exec(io.exec);
		},
	});

	return pkg;
}
