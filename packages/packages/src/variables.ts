import { Maybe } from "@macrograph/option";
import { Package, type PropertyDef } from "@macrograph/runtime";
import { createEventBus } from "@solid-primitives/event-bus";
import { createEffect, on } from "solid-js";

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

	pkg.createSchema({
		name: "Get Graph Variable",
		type: "pure",
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
		run({ ctx, io, properties }) {
			if (!io) return;

			const variableId = ctx.getProperty(properties.variable);
			if (variableId === undefined) return;

			ctx.setOutput(io, ctx.getVariable("graph", variableId).unwrap().value);
		},
	});

	pkg.createSchema({
		name: "Set Graph Variable",
		type: "exec",
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
		run({ ctx, io, properties }) {
			if (!io) return;

			const variableId = ctx.getProperty(properties.variable);
			if (variableId === undefined) return;

			ctx.setVariable("graph", variableId, ctx.getInput(io));
		},
	});

	pkg.createSchema({
		name: "Graph Variable Changed",
		type: "event",
		properties: { variable: graphVariableProperty },
		createListener: ({ ctx, properties }) => {
			const bus = createEventBus<any>();

			const variableId = ctx.getProperty(properties.variable);
			const variable = ctx.graph.variables.find((v) => v.id === variableId);
			if (!variable) return bus;

			createEffect(
				on(
					() => variable.value,
					(value, prev) =>
						bus.emit({
							value: value,
							previousValue: prev ?? variable.previous,
						}),
					{ defer: true },
				),
			);

			return bus;
		},
		createIO({ io, ctx, properties }) {
			const exec = io.execOutput({ id: "exec" });

			const variableId = ctx.getProperty(properties.variable);
			const variable = ctx.graph.variables.find((v) => v.id === variableId);
			if (!variable) return;

			return {
				exec,
				variable,
				output: io.dataOutput({
					id: "output",
					name: variable.name,
					type: variable.type,
				}),
				previousOutput: io.dataOutput({
					id: "previousOutput",
					name: "Previous Value",
					type: variable.type,
				}),
			};
		},
		run({ ctx, data, io }) {
			if (!io) return;

			console.log("test");

			ctx.setOutput(io.output, data.value);
			ctx.setOutput(io.previousOutput, data.previousValue);
			ctx.exec(io.exec);
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

	pkg.createSchema({
		name: "Get Project Variable",
		type: "pure",
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
		run({ ctx, io, properties }) {
			if (!io) return;

			Maybe(ctx.getProperty(properties.variable))
				.andThen((variableId) => ctx.getVariable("project", variableId))
				.peek((variable) => ctx.setOutput(io, variable.value));
		},
	});

	pkg.createSchema({
		name: "Set Project Variable",
		type: "exec",
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
		run({ ctx, io, properties }) {
			if (!io) return;

			Maybe(ctx.getProperty(properties.variable)).peek((variableId) =>
				ctx.setVariable("project", variableId, ctx.getInput(io)),
			);
		},
	});

	pkg.createSchema({
		name: "Project Variable Changed",
		type: "event",
		properties: { variable: projectVariableProperty },
		createListener: ({ ctx, properties }) => {
			const bus = createEventBus<any>();

			const variableId = ctx.getProperty(properties.variable);
			const variable = ctx.graph.project.variables.find(
				(v) => v.id === variableId,
			);
			if (!variable) return bus;

			createEffect(
				on(
					() => variable.value,
					(value, prev) =>
						bus.emit({
							value: value,
							previousValue: prev ?? variable.previous,
						}),
					{ defer: true },
				),
			);

			return bus;
		},
		createIO({ io, ctx, properties }) {
			const exec = io.execOutput({ id: "exec" });

			const variableId = ctx.getProperty(properties.variable);
			const variable = ctx.graph.project.variables.find(
				(v) => v.id === variableId,
			);
			if (!variable) return;

			return {
				exec,
				variable,
				output: io.dataOutput({
					id: "output",
					name: variable.name,
					type: variable.type,
				}),
				previousOutput: io.dataOutput({
					id: "previousOutput",
					name: "Previous Value",
					type: variable.type,
				}),
			};
		},
		run({ ctx, data, io }) {
			if (!io) return;

			ctx.setOutput(io.output, data.value);
			ctx.setOutput(io.previousOutput, data.previousValue);
			ctx.exec(io.exec);
		},
	});

	return pkg;
}
