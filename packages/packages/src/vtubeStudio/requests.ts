import type { Option } from "@macrograph/option";
import {
	type CreateIOFn,
	type CreateNonEventSchema,
	type MergeFnProps,
	type PropertyDef,
	type RunProps,
	type SchemaProperties,
	createStruct,
} from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import type { ApiClient } from "vtubestudio";

import { client } from "tmi.js";
import type { Pkg } from ".";
import { defaultProperties } from "./resource";

const Model = createStruct("Model", (s) => ({
	modelLoaded: s.field("Loaded", t.bool()),
	modelName: s.field("Name", t.string()),
	modelID: s.field("ID", t.string()),
	vtsModelName: s.field("VTS Name", t.string()),
	vtsModelIconName: s.field("VTS Icon Name", t.string()),
}));

const Expression = createStruct("Expression", (s) => ({
	name: s.field("Name", t.string()),
	file: s.field("File", t.string()),
	active: s.field("Active", t.bool()),
}));

const Hotkey = createStruct("Hotkey", (s) => ({
	name: s.field("Name", t.string()),
	id: s.field("ID", t.string()),
	type: s.field("Type", t.string()),
	description: s.field("Description", t.string()),
	file: s.field("File", t.string()),
}));

export function requests(pkg: Pkg) {
	pkg.registerType(Model);
	pkg.registerType(Expression);
	pkg.registerType(Hotkey);

	function createVTSExecSchema<
		TProperties extends Record<string, PropertyDef> = Record<string, never>,
		TIO = void,
	>(
		s: Omit<
			CreateNonEventSchema<TProperties & typeof defaultProperties, TIO>,
			"type" | "run" | "createIO"
		> & {
			properties?: TProperties;
			run(
				props: RunProps<TProperties, TIO> & {
					vts: ApiClient;
				},
			): void | Promise<void>;
			createIO: MergeFnProps<
				CreateIOFn<TProperties, TIO>,
				{ vts(): Option<ApiClient> }
			>;
		},
	) {
		pkg.createSchema({
			...s,
			type: "exec",
			properties: { ...s.properties, ...defaultProperties } as any,
			createIO(props) {
				const vts = props.ctx.getProperty(
					(props.properties as SchemaProperties<typeof defaultProperties>)
						.instance,
				);
				return s.createIO({ ...props, vts: () => vts });
			},
			run(props) {
				const vts = props.ctx
					.getProperty(
						(props.properties as SchemaProperties<typeof defaultProperties>)
							.instance,
					)
					.expect("No VTube Studio instance available!");

				if (!vts.isConnected)
					throw new Error("VTube Studio instance not connected!");

				return s.run(Object.assign(props, { vts }));
			},
		});
	}

	createVTSExecSchema({
		name: "Available Models",
		createIO: ({ io }) => {
			return io.dataOutput({
				id: "models",
				type: t.list(t.struct(Model)),
			});
		},
		run: async ({ ctx, io, vts }) => {
			const resp = await vts.availableModels();

			ctx.setOutput(io, resp.availableModels);
		},
	});

	createVTSExecSchema({
		name: "Load Model",
		createIO: ({ io, vts }) => {
			return io.dataInput({
				id: "model",
				type: t.string(),
				fetchSuggestions: () =>
					vts()
						.mapAsync(async (vts) => {
							const { availableModels } = await vts.availableModels();
							return availableModels.map((m) => m.modelID);
						})
						.then((o) => o.unwrapOr([])),
			});
		},
		async run({ ctx, io, vts }) {
			await vts.modelLoad({ modelID: ctx.getInput(io) });
		},
	});

	createVTSExecSchema({
		name: "Expression State",
		createIO: ({ io }) => {
			return {
				expressions: io.dataOutput({
					id: "expressions",
					name: "Expressions",
					type: t.list(t.struct(Expression)),
				}),
			};
		},
		async run({ ctx, io, vts }) {
			const { expressions } = await vts.expressionState({ details: false });

			ctx.setOutput(io.expressions, expressions);
		},
	});

	createVTSExecSchema({
		name: "Toggle Expression",
		createIO: ({ io, vts }) => {
			return {
				file: io.dataInput({
					id: "file",
					name: "File URL",
					type: t.string(),
					fetchSuggestions: () =>
						vts()
							.mapAsync(async (vts) => {
								const { expressions } = await vts.expressionState({
									details: false,
								});
								return expressions.map((e) => e.file);
							})
							.then((o) => o.unwrapOr([])),
				}),
				active: io.dataInput({
					id: "active",
					name: "Active",
					type: t.bool(),
				}),
			};
		},
		async run({ ctx, io, vts }) {
			await vts.expressionActivation({
				expressionFile: ctx.getInput(io.file),
				active: ctx.getInput(io.active),
			});
		},
	});

	createVTSExecSchema({
		name: "Get Hotkey List",
		createIO: ({ io }) =>
			io.dataOutput({
				id: "",
				type: t.list(t.struct(Hotkey)),
			}),
		async run({ ctx, io, vts }) {
			const resp = await vts.hotkeysInCurrentModel({});

			ctx.setOutput(
				io,
				resp.availableHotkeys.map((h) =>
					Hotkey.create({
						name: h.name,
						id: h.hotkeyID,
						type: h.type,
						description: h.description,
						file: h.file,
					}),
				),
			);
		},
	});

	createVTSExecSchema({
		name: "Execute Hotkey",
		createIO: ({ io, vts }) => {
			return io.dataInput({
				id: "id",
				name: "Hotkey ID",
				type: t.string(),
				fetchSuggestions: () =>
					vts()
						.mapAsync(async (vts) => {
							const resp = await vts.hotkeysInCurrentModel({});
							return resp.availableHotkeys.map((h) => h.name).filter(Boolean);
						})
						.then((o) => o.unwrapOr([])),
			});
		},
		async run({ ctx, io, vts }) {
			await vts.hotkeyTrigger({ hotkeyID: ctx.getInput(io) });
		},
	});
}
