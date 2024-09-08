import * as v from "valibot";

import type { Pkg } from ".";

export function createTypes(pkg: Pkg) {
  const Sliders = pkg.createEnum("Sliders", (e) => [
    e.variant("A"),
    e.variant("B"),
    e.variant("C"),
    e.variant("D"),
  ]);

  const MicType = pkg.createEnum("Mic Type", (e) => [
    e.variant("Dynamic"),
    e.variant("Condenser"),
    e.variant("Jack"),
  ]);

  const Presets = pkg.createEnum("Presets", (e) => [
    e.variant("Preset1"),
    e.variant("Preset2"),
    e.variant("Preset3"),
    e.variant("Preset4"),
    e.variant("Preset5"),
    e.variant("Preset6"),
  ]);

  const Inputs = pkg.createEnum("Inputs", (e) => [
    e.variant("Microphone"),
    e.variant("Chat"),
    e.variant("Music"),
    e.variant("Game"),
    e.variant("Console"),
    e.variant("LineIn"),
    e.variant("System"),
    e.variant("Samples"),
  ]);

  const Outputs = pkg.createEnum("Outputs", (e) => [
    e.variant("Headphones"),
    e.variant("BroadcastMix"),
    e.variant("LineOut"),
    e.variant("ChatMic"),
    e.variant("Sampler"),
  ]);

  return {
    Sliders,
    MicType,
    Presets,
    Inputs,
    Outputs,
  };
}

export type Types = ReturnType<typeof createTypes>;

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
