import { z } from "zod";

export const Levels = z.object({
	volumes: z.record(z.string(), z.number()),
});

export const MixerStatus = z.object({
	levels: Levels,
});

export const DaemonStatus = z.object({
	mixers: z.record(z.string(), MixerStatus),
});

function op<
	K extends string,
	T extends Record<string, z.ZodSchema> = Record<string, never>,
>(op: K, schema: T) {
	return z.object({
		op: z.literal(op),
		path: z.string(),
		...schema,
	});
}

export const PatchOperation = z.union([
	op("add", { value: z.any() }),
	op("remove", {}),
	op("replace", { value: z.any() }),
	op("move", { from: z.string() }),
	op("copy", { from: z.string() }),
	op("test", { value: z.any() }),
]);

export const Patch = z.array(PatchOperation);

export const DaemonResponse = z.union([
	z.literal("Ok"),
	z.object({
		Error: z.string(),
	}),
	z.object({
		Status: DaemonStatus,
	}),
	z.object({
		Patch,
	}),
]);

export const WebSocketResponse = z.object({
	id: z.number(),
	data: DaemonResponse,
});
