import type { Core, Package } from "@macrograph/runtime";

export type HostMirrorIntegrationSlice = {
	/** Key under `hostMirror.slices` in the wire payload */
	id: string;
	collect: (core: Core) => Promise<unknown>;
	apply: (core: Core, data: unknown) => void;
	clear: (core: Core) => void;
};

function pkg(core: Core, name: string): Package<any, any> | undefined {
	return core.packages.find((p) => p.name === name) as Package<any, any> | undefined;
}

export const HOST_MIRROR_INTEGRATION_SLICES: HostMirrorIntegrationSlice[] = [
	{
		id: "voicemod",
		async collect(core) {
			const p = pkg(core, "Voicemod");
			if (!p?.ctx?.collectHostMirror) return null;
			return p.ctx.collectHostMirror();
		},
		apply(core, data) {
			const p = pkg(core, "Voicemod");
			p?.ctx?.applyHostMirror?.(data);
		},
		clear(core) {
			const p = pkg(core, "Voicemod");
			p?.ctx?.clearHostMirror?.();
		},
	},
	{
		id: "obs",
		async collect(core) {
			const p = pkg(core, "OBS Websocket");
			if (!p?.ctx?.collectHostMirror) return null;
			return p.ctx.collectHostMirror();
		},
		apply(core, data) {
			const p = pkg(core, "OBS Websocket");
			p?.ctx?.applyHostMirror?.(data);
		},
		clear(core) {
			const p = pkg(core, "OBS Websocket");
			p?.ctx?.clearHostMirror?.();
		},
	},
	{
		id: "goxlr",
		async collect(core) {
			const p = pkg(core, "GoXLR");
			if (!p?.ctx?.collectHostMirror) return null;
			return p.ctx.collectHostMirror();
		},
		apply(core, data) {
			const p = pkg(core, "GoXLR");
			p?.ctx?.applyHostMirror?.(data);
		},
		clear(core) {
			const p = pkg(core, "GoXLR");
			p?.ctx?.clearHostMirror?.();
		},
	},
	{
		id: "speakerbot",
		async collect(core) {
			const p = pkg(core, "SpeakerBot");
			if (!p?.ctx?.collectHostMirror) return null;
			return p.ctx.collectHostMirror();
		},
		apply(core, data) {
			const p = pkg(core, "SpeakerBot");
			p?.ctx?.applyHostMirror?.(data);
		},
		clear(core) {
			const p = pkg(core, "SpeakerBot");
			p?.ctx?.clearHostMirror?.();
		},
	},
	{
		id: "streamlabs",
		async collect(core) {
			const p = pkg(core, "Streamlabs");
			if (!p?.ctx?.collectHostMirror) return null;
			return p.ctx.collectHostMirror();
		},
		apply(core, data) {
			const p = pkg(core, "Streamlabs");
			p?.ctx?.applyHostMirror?.(data);
		},
		clear(core) {
			const p = pkg(core, "Streamlabs");
			p?.ctx?.clearHostMirror?.();
		},
	},
	{
		id: "websocket",
		async collect(core) {
			const p = pkg(core, "Websocket");
			if (!p?.ctx?.collectHostMirror) return null;
			return p.ctx.collectHostMirror();
		},
		apply(core, data) {
			const p = pkg(core, "Websocket");
			p?.ctx?.applyHostMirror?.(data);
		},
		clear(core) {
			const p = pkg(core, "Websocket");
			p?.ctx?.clearHostMirror?.();
		},
	},
	{
		id: "midi",
		async collect(core) {
			const p = pkg(core, "MIDI");
			if (!p?.ctx?.collectHostMirror) return null;
			return p.ctx.collectHostMirror();
		},
		apply(core, data) {
			const p = pkg(core, "MIDI");
			p?.ctx?.applyHostMirror?.(data);
		},
		clear(core) {
			const p = pkg(core, "MIDI");
			p?.ctx?.clearHostMirror?.();
		},
	},
	{
		id: "streamdeck",
		async collect(core) {
			const p = pkg(core, "Stream Deck WebSocket");
			if (!p?.ctx?.collectHostMirror) return null;
			return p.ctx.collectHostMirror();
		},
		apply(core, data) {
			const p = pkg(core, "Stream Deck WebSocket");
			p?.ctx?.applyHostMirror?.(data);
		},
		clear(core) {
			const p = pkg(core, "Stream Deck WebSocket");
			p?.ctx?.clearHostMirror?.();
		},
	},
];

export async function collectIntegrationSlices(
	core: Core,
): Promise<Record<string, unknown>> {
	const out: Record<string, unknown> = {};
	await Promise.all(
		HOST_MIRROR_INTEGRATION_SLICES.map(async (s) => {
			try {
				const v = await s.collect(core);
				if (v !== undefined && v !== null) out[s.id] = v;
			} catch {
				/* host mirror is best-effort */
			}
		}),
	);
	return out;
}

export function applyIntegrationSlices(
	core: Core,
	slices: Record<string, unknown> | undefined,
) {
	if (!slices) return;
	for (const s of HOST_MIRROR_INTEGRATION_SLICES) {
		if (slices && s.id in slices) {
			try {
				s.apply(core, slices[s.id]);
			} catch {
				/* best-effort */
			}
		}
	}
}

export function clearIntegrationSlices(core: Core) {
	for (const s of HOST_MIRROR_INTEGRATION_SLICES) {
		try {
			s.clear(core);
		} catch {
			/* ignore */
		}
	}
}
