import { createEnum, createStruct } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import {
  AlertFeature,
  AlertFeaturePut,
  ColorFeature,
  ColorFeatureBase,
  ColorTemperatureDeltaFeaturePut,
  ColorTemperatureFeature,
  ColorTemperatureFeaturePut,
  DimmingDeltaFeaturePut,
  DimmingFeature,
  DimmingFeatureBase,
  DynamicsFeature,
  DynamicsFeaturePut,
  EffectsFeature,
  EffectsFeaturePut,
  GradientFeature,
  GradientFeatureBase,
  OnFeature,
  PowerUpFeature,
  PowerUpFeaturePut,
  SignalingFeature,
  TimedEffectsFeature,
  TimedEffectsFeaturePut,
} from "./feature";
import { ResourceIdentifier, ResourceTypes } from "./resource";

export const GroupedLight = createStruct("Grouped Light", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  on: s.field("On", t.option(t.struct(OnFeature))),
  dimming: s.field("Dimming", t.option(t.struct(DimmingFeatureBase))),
  alert: s.field("Alert", t.option(t.struct(AlertFeature))),
  type: s.field("Type", t.enum(ResourceTypes)),
}));

export const GroupedLightPut = createStruct("Grouped Light", (s) => ({
  on: s.field("On", t.option(t.struct(OnFeature))),
  dimming: s.field("Dimming", t.option(t.struct(DimmingFeatureBase))),
  dimming_delta: s.field(
    "Dimming Delta",
    t.option(t.struct(DimmingDeltaFeaturePut))
  ),
  color_temperature: s.field(
    "Color Temperature",
    t.option(t.struct(ColorTemperatureFeaturePut))
  ),
  color_temperature_delta: s.field(
    "Color Temperature Delta",
    t.option(t.struct(ColorTemperatureDeltaFeaturePut))
  ),
  color: s.field("Color", t.option(t.struct(ColorFeatureBase))),
  dynamics: s.field("Dynamics", t.option(t.struct(DynamicsFeaturePut))),
  alert: s.field("Alert", t.option(t.struct(AlertFeaturePut))),
}));

export const LightMetadata = createStruct("Light Metadata", (s) => ({
  archetype: s.field("Archetype", t.option(t.string())),
  name: s.field("Name", t.string()),
}));

export const LightMode = createEnum("Light Mode", (e) => [
  e.variant("normal"),
  e.variant("streaming"),
]);

export const Light = createStruct("Light", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  owner: s.field("Owner", t.struct(ResourceIdentifier)),
  on: s.field("On", t.struct(OnFeature)),
  mode: s.field("Mode", t.enum(LightMode)),
  dimming: s.field("Dimming", t.option(t.struct(DimmingFeature))),
  color_temperature: s.field(
    "Color Temperature",
    t.option(t.struct(ColorTemperatureFeature))
  ),
  color: s.field("Color", t.option(t.struct(ColorFeature))),
  dynamics: s.field("Dynamics", t.option(t.struct(DynamicsFeature))),
  alert: s.field("Alert", t.option(t.struct(AlertFeature))),
  signaling: s.field("Signaling", t.option(t.struct(SignalingFeature))),
  gradient: s.field("Gradient", t.option(t.struct(GradientFeature))),
  effects: s.field("Effects", t.option(t.struct(EffectsFeature))),
  timed_effects: s.field(
    "Timed Effects",
    t.option(t.struct(TimedEffectsFeature))
  ),
  powerup: s.field("PowerUp", t.option(t.struct(PowerUpFeature))),
  type: s.field("Type", t.enum(ResourceTypes)),
}));

export const LightPut = createStruct("Light", (s) => ({
  on: s.field("On", t.option(t.struct(OnFeature))),
  dimming: s.field("Dimming", t.option(t.struct(DimmingFeatureBase))),
  dimming_delta: s.field(
    "Dimming Delta",
    t.option(t.struct(DimmingDeltaFeaturePut))
  ),
  color_temperature: s.field(
    "Color Temperature",
    t.option(t.struct(ColorTemperatureFeaturePut))
  ),
  color_temperature_delta: s.field(
    "Color Temperature Delta",
    t.option(t.struct(ColorTemperatureDeltaFeaturePut))
  ),
  color: s.field("Color", t.option(t.struct(ColorFeatureBase))),
  dynamics: s.field("Dynamics", t.option(t.struct(DynamicsFeaturePut))),
  alert: s.field("Alert", t.option(t.struct(AlertFeaturePut))),
  gradient: s.field("Gradient", t.option(t.struct(GradientFeatureBase))),
  effects: s.field("Effects", t.option(t.struct(EffectsFeaturePut))),
  timed_effects: s.field(
    "Timed Effects",
    t.option(t.struct(TimedEffectsFeaturePut))
  ),
  powerup: s.field("PowerUp", t.option(t.struct(PowerUpFeaturePut))),
}));
