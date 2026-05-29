import { Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";

import { type Ctx, createCtx } from "./ctx";

export type Pkg = Package<Record<string, never>, Ctx>;

export type AudioBackend = {
	play: (path: string, deviceName?: string | null) => Promise<string>;
	stop: (id: string) => Promise<void>;
	setVolume: (id: string, volume: number) => Promise<void>;
	stopAll: () => Promise<void>;
	onStopped?: {
		listen: (cb: (id: string) => void) => () => void;
	};
};

const sounds = new Map<string, HTMLAudioElement>();
const backendSounds = new Map<string, string>();
const backendSoundsReverse = new Map<string, string>();

export function pkg(args: {
	prepareURL(url: string): string;
	getDeviceName?: () => string | undefined | null;
	selectFile?: () => Promise<string | null>;
	backend?: AudioBackend;
}) {
	const ctx = createCtx();
	const pkg: Pkg = new Package({
		name: "Audio",
		ctx,
	});

	pkg.createSchema({
		name: "Play Audio File",
		type: "exec",
		properties: {
			useFilePicker: {
				name: "File Picker",
				type: t.bool(),
				default: false,
			},
			file: {
				name: "File Location",
				type: t.string(),
				filePicker: args.selectFile,
			},
		},
		createIO({ io, ctx, properties }) {
			const usePicker = ctx.getProperty(properties.useFilePicker);

			return {
				...(usePicker
					? {}
					: {
							file: io.dataInput({
								id: "file",
								name: "File Location",
								type: t.string(),
							}),
					  }),
				id: io.dataInput({
					id: "id",
					name: "ID",
					type: t.string(),
				}),
				volume: io.dataInput({
					id: "volume",
					type: t.int(),
				}),
				idOut: io.dataOutput({
					id: "idOut",
					name: "ID",
					type: t.string(),
				}),
			};
		},
		async run({ ctx, io, properties }) {
			const id = ctx.getInput(io.id);
			ctx.setOutput(io.idOut, id);

			const usePicker = ctx.getProperty(properties.useFilePicker);
			const file = usePicker
				? ctx.getProperty(properties.file)
				: "file" in io
					? ctx.getInput((io as any).file)
					: "";

			if (!file) {
				console.error("Play Audio File: no file path provided");
				return;
			}

			if (args.backend) {
				try {
					const deviceName = args.getDeviceName?.();
					const backendId = await args.backend.play(file, deviceName);
					backendSounds.set(id, backendId);
					backendSoundsReverse.set(backendId, id);
				} catch (e) {
					console.error("Play Audio File: failed to play", e);
				}
				return;
			}

			const url = file.startsWith("http") ? file : args.prepareURL(file);
			const mysound = new Audio(url);
			mysound.volume = ctx.getInput(io.volume) / 100;

			try {
				await mysound.play();
			} catch (e) {
				console.error("Play Audio File: failed to play audio", e);
				return;
			}
			sounds.set(id, mysound);
			mysound.onended = () => {
				pkg.emitEvent({ name: "AudioStopped", data: { id } });
				sounds.delete(id);
			};
		},
	});

	pkg.createEventSchema({
		event: "AudioStopped",
		name: "Audio Stopped Playing",
		createIO: ({ io }) => {
			return {
				exec: io.execOutput({
					id: "exec",
					name: "",
				}),
				id: io.dataOutput({
					id: "id",
					name: "ID",
					type: t.string(),
				}),
			};
		},
		run({ ctx, data, io }) {
			ctx.setOutput(io.id, data.id);
			ctx.exec(io.exec);
		},
	});

	pkg.createSchema({
		name: "Stop Audio",
		type: "exec",
		createIO({ io }) {
			return {
				id: io.dataInput({
					id: "id",
					name: "Reference ID",
					type: t.string(),
				}),
			};
		},
		async run({ ctx, io }) {
			const id = ctx.getInput(io.id);
			if (args.backend) {
				const backendId = backendSounds.get(id);
				if (backendId) {
					await args.backend.stop(backendId);
					backendSounds.delete(id);
					backendSoundsReverse.delete(backendId);
				}
			} else if (sounds.has(id)) {
				const playing = sounds.get(ctx.getInput(io.id));
				if (playing) playing.pause();
			}
			pkg.emitEvent({ name: "AudioStopped", data: { id } });
		},
	});

	pkg.createSchema({
		name: "Set Audio Volume",
		type: "exec",
		createIO({ io }) {
			return {
				id: io.dataInput({
					id: "id",
					name: "Reference ID",
					type: t.string(),
				}),
				volume: io.dataInput({
					id: "volume",
					type: t.int(),
				}),
			};
		},
		async run({ ctx, io }) {
			const id = ctx.getInput(io.id);
			const volume = ctx.getInput(io.volume);
			if (args.backend) {
				const backendId = backendSounds.get(id);
				if (backendId) await args.backend.setVolume(backendId, volume);
			} else if (sounds.has(id)) {
				const playing = sounds.get(ctx.getInput(io.id));
				if (playing) playing.volume = volume / 100;
			}
		},
	});

	pkg.createSchema({
		name: "Stop All Audio",
		type: "exec",
		createIO({ io }) {
			return {};
		},
		async run() {
			if (args.backend) {
				await args.backend.stopAll();
				backendSounds.clear();
				backendSoundsReverse.clear();
			} else {
				for (const [, value] of sounds.entries()) {
					if (value) value.pause();
				}
			}
		},
	});

	if (args.backend?.onStopped) {
		args.backend.onStopped.listen((backendId) => {
			const originalId = backendSoundsReverse.get(backendId);
			if (originalId) {
				backendSounds.delete(originalId);
				backendSoundsReverse.delete(backendId);
				pkg.emitEvent({ name: "AudioStopped", data: { id: originalId } });
			}
		});
	}

	return pkg;
}
