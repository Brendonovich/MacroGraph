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
import {
  ResourceIdentifier,
  ResourceTypes,
  ResourceTypesArr,
} from "./resource";
import { z } from "zod";

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

export const test = ResourceTypes.variants;

export const LIGHT_SCHEMA = z.object({
  id: z.string(),
  id_v1: z.string().optional(),
  owner: z.object({
    rid: z.string(),
    rtype: z.enum(ResourceTypesArr),
  }),
  on: z.object({
    on: z.boolean(),
  }),
  mode: z.enum(["normal", "streaming"]),
  dimming: z
    .object({
      brightness: z.number(),
      min_dim_level: z.number().optional(),
    })
    .optional(),
  color_temperature: z
    .object({
      mirek: z.number().int().optional(),
      mirek_schema: z.object({
        mirek_minimum: z.number().int(),
        mirek_maximum: z.number().int(),
      }),
      mirek_valid: z.boolean(),
    })
    .optional(),
  color: z
    .object({
      gamut_type: z.enum(["A", "B", "C", "other"]),
      gamut: z
        .object({
          red: z.object({
            x: z.number(),
            y: z.number(),
          }),
          green: z.object({
            x: z.number(),
            y: z.number(),
          }),
          blue: z.object({
            x: z.number(),
            y: z.number(),
          }),
        })
        .optional(),
      xy: z.object({
        x: z.number(),
        y: z.number(),
      }),
    })
    .optional(),
  dynamics: z
    .object({
      speed: z.number(),
      speed_valid: z.boolean(),
      status: z.enum(["none", "dynamic_palette", "unknown"]),
      status_values: z.array(z.enum(["none", "dynamic_palette", "unknown"])),
    })
    .optional(),
  alert: z
    .object({
      action_values: z.array(z.enum(["breathe", "unknown"])),
    })
    .optional(),
  signaling: z
    .object({
      status: z
        .object({
          signal: z.enum([
            "no_signal",
            "on_off",
            "on_off_color",
            "alternating",
            "unknown",
          ]),
          estimated_end: z.string().optional(),
          colors: z
            .array(
              z.object({
                xy: z.object({
                  x: z.number(),
                  y: z.number(),
                }),
              })
            )
            .optional(),
        })
        .optional(),
      signal_values: z.array(
        z.enum([
          "no_signal",
          "on_off",
          "on_off_color",
          "alternating",
          "unknown",
        ])
      ),
    })
    .optional(),
  gradient: z
    .object({
      points: z.array(
        z.object({
          color: z.object({
            xy: z.object({
              x: z.number(),
              y: z.number(),
            }),
          }),
        })
      ),
      points_capable: z.number().int(),
      mode: z.enum([
        "interpolated_palette",
        "interpolated_palette_mirrored",
        "random_pixelated",
      ]),
      mode_values: z.array(
        z.enum([
          "interpolated_palette",
          "interpolated_palette_mirrored",
          "random_pixelated",
        ])
      ),
      pixel_count: z.number().int().optional(),
    })
    .optional(),
  effects: z
    .object({
      status: z.enum([
        "no_effect",
        "candle",
        "fire",
        "sparkle",
        "glisten",
        "opal",
        "prism",
        "unknown",
      ]),
      effect_values: z.array(
        z.enum([
          "no_effect",
          "candle",
          "fire",
          "sparkle",
          "glisten",
          "opal",
          "prism",
          "unknown",
        ])
      ),
      status_values: z.array(
        z.enum([
          "no_effect",
          "candle",
          "fire",
          "sparkle",
          "glisten",
          "opal",
          "prism",
          "unknown",
        ])
      ),
    })
    .optional(),
  timed_effects: z
    .object({
      status: z.enum(["no_effect", "sunrise", "unknown"]),
      effect: z.enum(["no_effect", "sunrise", "unknown"]).optional(),
      status_values: z.array(z.enum(["no_effect", "sunrise", "unknown"])),
      effect_values: z.array(z.enum(["no_effect", "sunrise", "unknown"])),
      duration: z.number().int().optional(),
    })
    .optional(),
  powerup: z
    .object({
      preset: z.enum([
        "safety",
        "powerfail",
        "last_on_state",
        "custom",
        "unknown",
      ]),
      configured: z.boolean(),
      on: z.object({
        mode: z.enum(["on", "toggle", "previous"]),
        on: z
          .object({
            on: z.boolean(),
          })
          .optional(),
      }),
      dimming: z
        .object({
          mode: z.enum(["dimming", "previous"]),
          dimming: z
            .object({
              brightness: z.number(),
            })
            .optional(),
        })
        .optional(),
      color: z
        .object({
          mode: z.enum(["color_temperature", "color", "previous"]),
          color_temperature: z
            .object({
              mirek: z.number().int().optional(),
            })
            .optional(),
          color: z
            .object({
              xy: z.object({
                x: z.number(),
                y: z.number(),
              }),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
  type: z.enum(ResourceTypesArr),
});
