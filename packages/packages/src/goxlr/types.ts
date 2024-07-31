import * as v from "valibot";

export const Levels = v.object({
	volumes: v.record(v.string(), v.number()),
});

export const MixerStatus = v.object({
	levels: Levels,
});

export const DaemonStatus = v.object({
	mixers: v.record(v.string(), MixerStatus),
});

function op<
	K extends string,
	T extends Record<string, v.BaseSchema<any, any, any>> = Record<string, never>,
>(op: K, schema: T) {
	return v.object({ op: v.literal(op), path: v.string(), ...schema });
}

export const PatchOperation = v.union([
	op("add", { value: v.any() }),
	op("remove", {}),
	op("replace", { value: v.any() }),
	op("move", { from: v.string() }),
	op("copy", { from: v.string() }),
	op("test", { value: v.any() }),
]);

export const Patch = v.array(PatchOperation);

export const DaemonResponse = v.union([
	v.literal("Ok"),
	v.object({ Error: v.string() }),
	v.object({ Status: DaemonStatus }),
	v.object({ Patch }),
]);

export const WebSocketResponse = v.object({
	id: v.number(),
	data: DaemonResponse,
});
