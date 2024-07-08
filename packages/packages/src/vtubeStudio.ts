import { Package, createStruct } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { makePersisted } from "@solid-primitives/storage";
import { createSignal } from "solid-js";
import { ApiClient } from "vtubestudio";

export type Pkg = ReturnType<typeof pkg>;

export function pkg() {
	// const ctx = createCtx((e) => pkg.emitEvent(e));

	const pkg = new Package({
		name: "VTube Studio",
		// ctx,
		// SettingsUI: () => import("./Settings"),
	});

	const [authToken, setAuthToken] = makePersisted(
		createSignal<string | null>(null),
		{ name: "VTubeStudio Auth" },
	);

	const client = new ApiClient({
		pluginName: "MacroGraph",
		pluginDeveloper: "MacroGraph Inc.",
		authTokenGetter: authToken,
		authTokenSetter: setAuthToken,
	});

	const Model = createStruct("Model", (s) => ({
		modelLoaded: s.field("Loaded", t.bool()),
		modelName: s.field("Name", t.string()),
		modelID: s.field("ID", t.string()),
		vtsModelName: s.field("VTS Name", t.string()),
		vtsModelIconName: s.field("VTS Icon Name", t.string()),
	}));

	pkg.registerType(Model);

	pkg.createSchema({
		type: "exec",
		name: "Available Models",
		createIO: ({ io }) => {
			return io.dataOutput({
				id: "models",
				type: t.list(t.struct(Model)),
			});
		},
		run: async ({ ctx, io }) => {
			const resp = await client.availableModels();

			ctx.setOutput(io, resp.availableModels);
		},
	});

	pkg.createSchema({
		type: "exec",
		name: "Load Model",
		createIO: ({ io }) => {
			return io.dataInput({
				id: "model",
				type: t.string(),
				fetchSuggestions: async () => {
					const { availableModels } = await client.availableModels();
					return availableModels.map((m) => m.modelID);
				},
			});
		},
		async run({ ctx, io }) {
			await client.modelLoad({ modelID: ctx.getInput(io) });
		},
	});

	const Expression = createStruct("Expression", (s) => ({
		name: s.field("Name", t.string()),
		file: s.field("File", t.string()),
		active: s.field("Active", t.bool()),
	}));

	pkg.createSchema({
		type: "exec",
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
		async run({ ctx, io }) {
			const { expressions } = await client.expressionState({ details: false });
			console.log({ expressions });

			ctx.setOutput(io.expressions, expressions);
		},
	});

	pkg.createSchema({
		type: "exec",
		name: "Toggle Expression",
		createIO: ({ io }) => {
			return {
				file: io.dataInput({
					id: "file",
					name: "File URL",
					type: t.string(),
					fetchSuggestions: async () => {
						const { expressions } = await client.expressionState({
							details: false,
						});
						return expressions.map((e) => e.file);
					},
				}),
				active: io.dataInput({
					id: "active",
					name: "Active",
					type: t.bool(),
				}),
			};
		},
		async run({ ctx, io }) {
			await client.expressionActivation({
				expressionFile: ctx.getInput(io.file),
				active: ctx.getInput(io.active),
			});
		},
	});

	const Hotkey = createStruct("Hotkey", (s) => ({
		name: s.field("Name", t.string()),
		id: s.field("ID", t.string()),
		type: s.field("Type", t.string()),
		description: s.field("Description", t.string()),
		file: s.field("File", t.string()),
	}));

	pkg.registerType(Hotkey);

	pkg.createSchema({
		type: "exec",
		name: "Get Hotkey List",
		createIO: ({ io }) =>
			io.dataOutput({
				id: "",
				type: t.list(t.struct(Hotkey)),
			}),
		async run({ ctx, io }) {
			const resp = await client.hotkeysInCurrentModel({});

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

	pkg.createSchema({
		type: "exec",
		name: "Execute Hotkey",
		createIO: ({ io }) => {
			return io.dataInput({
				id: "id",
				name: "Hotkey ID",
				type: t.string(),
				fetchSuggestions: () =>
					client
						.hotkeysInCurrentModel({})
						.then((resp) =>
							resp.availableHotkeys.map((h) => h.name).filter(Boolean),
						),
			});
		},
		async run({ ctx, io }) {
			await client.hotkeyTrigger({ hotkeyID: ctx.getInput(io) });
		},
	});

	return pkg;
}
