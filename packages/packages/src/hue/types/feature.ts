import { createEnum, createStruct } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";

export const OnFeature = createStruct("On", (s) => ({
  on: s.field("On", t.bool()),
}));

export const DimmingFeatureBase = createStruct("Dimming Base", (s) => ({
  brightness: s.field("Brightness", t.float()),
}));

export const DimmingFeature = createStruct("Dimming", (s) => ({
  ...DimmingFeatureBase.fields,
  min_dim_level: s.field("Min Dim Level", t.option(t.float())),
}));

export const DeltaAction = createEnum("Delta Action", (e) => [
  e.variant("up"),
  e.variant("down"),
  e.variant("stop"),
]);

export const DimmingDeltaFeaturePut = createStruct("Dimming Delta", (s) => ({
  action: s.field("Delta Action", t.enum(DeltaAction)),
  brightness_delta: s.field("Brightness Delta", t.option(t.float())),
}));

export const ColorTemperatureDeltaFeaturePut = createStruct(
  "Color Temperature Delta",
  (s) => ({
    action: s.field("Delta Action", t.enum(DeltaAction)),
    mirek_delta: s.field("Mirek Delta", t.option(t.int())),
  })
);

export const Position = createStruct("Position", (s) => ({
  x: s.field("X", t.float()),
  y: s.field("Y", t.float()),
  Z: s.field("Z", t.float()),
}));

export const AlertEffectType = createEnum("Alert Effect Type", (e) => [
  e.variant("breathe"),
  e.variant("unknown"),
]);

export const AlertFeature = createStruct("Alert", (s) => ({
  action_values: s.field("Action Values", t.list(t.enum(AlertEffectType))),
}));

export const AlertFeaturePut = createStruct("Alert", (s) => ({
  action: s.field("Action", t.enum(AlertEffectType)),
}));

const IdentifyAction = createEnum("Identify", (e) => [e.variant("identify")]);

export const IdentifyFeature = createStruct("Identify", (s) => ({
  action: s.field("Action", t.enum(IdentifyAction)),
}));

export const ColorPoint = createStruct("Color Point", (s) => ({
  x: s.field("X", t.float()),
  y: s.field("Y", t.float()),
}));

export const ColorGamut = createStruct("Color Gamut", (s) => ({
  red: s.field("Red", t.struct(ColorPoint)),
  green: s.field("Green", t.struct(ColorPoint)),
  blue: s.field("Blue", t.struct(ColorPoint)),
}));

export const GamutType = createEnum("Gamut Type", (e) => [
  e.variant("A"),
  e.variant("B"),
  e.variant("C"),
  e.variant("other"),
]);

export const ColorFeatureBase = createStruct("Color Base", (s) => ({
  xy: s.field("XY", t.struct(ColorPoint)),
}));

export const ColorFeature = createStruct("Color", (s) => ({
  ...ColorFeatureBase.fields,
  gamut_type: s.field("Gamut Type", t.enum(GamutType)),
  gamut: s.field("Gamut", t.option(t.struct(ColorGamut))),
}));

export const MirekSchema = createStruct("Mirek Schema", (s) => ({
  mirek_minimum: s.field("Mirek Minimum", t.int()),
  mirek_maximum: s.field("Mirek Maximum", t.int()),
}));

export const ColorTemperatureFeatureBase = createStruct(
  "Color Temperature Base",
  (s) => ({
    mirek: s.field("Mirek", t.option(t.int())),
  })
);

export const ColorTemperatureFeature = createStruct(
  "Color Temperature",
  (s) => ({
    ...ColorTemperatureFeatureBase.fields,
    mirek_schema: s.field("Mirek Schema", t.struct(MirekSchema)),
    mirek_valid: s.field("Mirek Valid", t.bool()),
  })
);

export const ColorTemperatureFeaturePut = createStruct(
  "Color Temperature",
  (s) => ({
    mirek: s.field("Mirek", t.int()),
  })
);

export const DynamicStatus = createEnum("Dynamic Status", (e) => [
  e.variant("none"),
  e.variant("dynamic_palette"),
  e.variant("unknown"),
]);

export const DynamicsFeature = createStruct("Dynamics", (s) => ({
  speed: s.field("Speed", t.float()),
  speed_valid: s.field("Speed Valid", t.bool()),
  status: s.field("Status", t.enum(DynamicStatus)),
  status_values: s.field("Status Values", t.list(t.enum(DynamicStatus))),
}));

export const DynamicsFeaturePut = createStruct("Dynamics", (s) => ({
  speed: s.field("Speed", t.option(t.float())),
  duration: s.field("Duration", t.option(t.int())),
}));

export const EffectStatus = createEnum("Effect Status", (e) => [
  e.variant("no_effect"),
  e.variant("candle"),
  e.variant("fire"),
  e.variant("sparkle"),
  e.variant("glisten"),
  e.variant("opal"),
  e.variant("prism"),
  e.variant("unknown"),
]);

export const SceneEffectsFeature = createStruct("Scene Effects", (s) => ({
  effect: s.field("Effect", t.enum(EffectStatus)),
}));

export const EffectsFeature = createStruct("Effects", (s) => ({
  status: s.field("Status", t.enum(EffectStatus)),
  effect_values: s.field("Effect Values", t.list(t.enum(EffectStatus))),
  status_values: s.field("Status Values", t.list(t.enum(EffectStatus))),
}));

export const EffectsFeaturePut = createStruct("Effects", (s) => ({
  effect: s.field("Effect", t.enum(EffectStatus)),
}));

export const TimedEffectStatus = createEnum("Timed Effect Status", (e) => [
  e.variant("no_effect"),
  e.variant("sunrise"),
  e.variant("unknown"),
]);

export const TimedEffectsFeature = createStruct("Timed Effects", (s) => ({
  status: s.field("Status", t.enum(TimedEffectStatus)),
  effect: s.field("Effect", t.option(t.enum(TimedEffectStatus))),
  status_values: s.field("Status Values", t.list(t.enum(TimedEffectStatus))),
  effect_values: s.field("Effect Values", t.list(t.enum(TimedEffectStatus))),
  duration: s.field("Duration", t.option(t.int())),
}));

export const TimedEffectsFeaturePut = createStruct("Timed Effects", (s) => ({
  effect: s.field("Effect", t.option(t.enum(TimedEffectStatus))),
  duration: s.field("Duration", t.option(t.int())),
}));

export const RecallAction = createEnum("Recall Action", (e) => [
  e.variant("active"),
  e.variant("static"),
  e.variant("dynamic_palette"),
]);

export const RecallFeature = createStruct("Recall", (s) => ({
  action: s.field("Action", t.option(t.enum(RecallAction))),
  status: s.field("Status", t.option(t.string())),
  duration: s.field("Duration", t.option(t.int())),
  dimming: s.field("Dimming", t.option(t.struct(DimmingFeatureBase))),
}));

export const PaletteFeatureColor = createStruct("Palette Color", (s) => ({
  color: s.field("Color", t.struct(ColorFeatureBase)),
  dimming: s.field("Dimming", t.struct(DimmingFeatureBase)),
}));

export const PaletteFeatureColorTemperature = createStruct(
  "Palette Color Temperature",
  (s) => ({
    color_temperature: s.field(
      "Color Temperature",
      t.struct(ColorTemperatureFeatureBase)
    ),
    dimming: s.field("Dimming", t.struct(DimmingFeatureBase)),
  })
);

export const PaletteFeature = createStruct("Palette", (s) => ({
  color: s.field("Color", t.list(t.struct(PaletteFeatureColor))),
  dimming: s.field("Dimming", t.list(t.struct(DimmingFeatureBase))),
  color_temperature: s.field(
    "Color Temperature",
    t.list(t.struct(PaletteFeatureColorTemperature))
  ),
}));

export const GradientPoint = createStruct("Gradient Point", (s) => ({
  color: s.field("Color", t.struct(ColorFeatureBase)),
}));

export const GradientMode = createEnum("Gradient Mode", (e) => [
  e.variant("interpolated_palette"),
  e.variant("interpolated_palette_mirrored"),
  e.variant("random_pixelated"),
]);

export const GradientFeatureBase = createStruct("Gradient Base", (s) => ({
  points: s.field("Points", t.list(t.struct(GradientPoint))),
}));

export const GradientFeature = createStruct("Gradient", (s) => ({
  ...GradientFeatureBase.fields,
  points_capable: s.field("Points Capable", t.int()),
  mode: s.field("Mode", t.enum(GradientMode)),
  mode_values: s.field("Mode Values", t.list(t.enum(GradientMode))),
  pixel_count: s.field("Pixel Count", t.option(t.int())),
}));

export const Signal = createEnum("Signal", (e) => [
  e.variant("no_signal"),
  e.variant("on_off"),
  e.variant("on_off_color"),
  e.variant("alternating"),
  e.variant("unknown"),
]);

export const SignalingFeatureStatus = createStruct("Signaling Status", (s) => ({
  signal: s.field("Signal", t.enum(Signal)),
  estimated_end: s.field("Estimated End", t.option(t.string())),
  colors: s.field("Colors", t.option(t.list(t.struct(ColorFeatureBase)))),
}));

export const SignalingFeature = createStruct("Signaling", (s) => ({
  status: s.field("Status", t.struct(SignalingFeatureStatus)),
  signal_values: s.field("Signal Values", t.list(t.enum(Signal))),
}));

export const PowerUpPreset = createEnum("PowerUp Preset", (e) => [
  e.variant("safety"),
  e.variant("powerfail"),
  e.variant("last_on_state"),
  e.variant("custom"),
  e.variant("unknown"),
]);

export const PowerUpFeatureOnMode = createEnum("PowerUp On Mode", (e) => [
  e.variant("on"),
  e.variant("toggle"),
  e.variant("previous"),
]);

export const PowerUpFeatureOnState = createStruct("PowerUp On State", (s) => ({
  mode: s.field("Mode", t.enum(PowerUpFeatureOnMode)),
  on: s.field("On", t.option(t.struct(OnFeature))),
}));

export const PowerUpFeatureDimmingMode = createEnum(
  "PowerUp Dimming Mode",
  (e) => [e.variant("dimming"), e.variant("previous")]
);

export const PowerUpFeatureDimmingState = createStruct(
  "PowerUp Dimming State",
  (s) => ({
    mode: s.field("Mode", t.enum(PowerUpFeatureDimmingMode)),
    dimming: s.field("Dimming", t.option(t.struct(DimmingFeatureBase))),
  })
);

export const PowerUpFeatureColorMode = createEnum("PowerUp Color Mode", (e) => [
  e.variant("color_temperature"),
  e.variant("color"),
  e.variant("previous"),
]);

export const PowerUpFeatureColorState = createStruct(
  "PowerUp Color State",
  (s) => ({
    mode: s.field("Mode", t.enum(PowerUpFeatureColorMode)),
    color_temperature: s.field(
      "Color Temperature",
      t.option(t.struct(ColorTemperatureFeatureBase))
    ),
    color: s.field("Color", t.option(t.struct(ColorFeatureBase))),
  })
);

export const PowerUpFeature = createStruct("PowerUp", (s) => ({
  preset: s.field("Preset", t.enum(PowerUpPreset)),
  configured: s.field("Configured", t.bool()),
  on: s.field("On", t.option(t.struct(PowerUpFeatureDimmingState))),
  color: s.field("Color", t.option(t.struct(PowerUpFeatureColorState))),
}));

export const PowerUpFeaturePut = createStruct("PowerUp", (s) => ({
  preset: s.field("Preset", t.enum(PowerUpPreset)),
  on: s.field("On", t.option(t.struct(PowerUpFeatureOnState))),
  dimming: s.field("Dimming", t.option(t.struct(PowerUpFeatureDimmingState))),
  color: s.field("Color", t.option(t.struct(PowerUpFeatureColorState))),
}));

export const MotionReport = createStruct("Motion Report", (s) => ({
  changed: s.field("Changed", t.string()),
  motion: s.field("Motion", t.bool()),
}));

export const MotionSensingFeature = createStruct("Motion Sensing", (s) => ({
  motion_report: s.field("Motion Report", t.option(t.struct(MotionReport))),
  motion: s.field("Motion", t.option(t.bool())),
  motion_valid: s.field("Motion Valid", t.option(t.bool())),
}));

export const MotionSensingFeatureSensitivityStatus = createEnum(
  "Motion Sensing Sensitivity Status",
  (e) => [e.variant("set"), e.variant("changing"), e.variant("unknown")]
);

export const MotionSensingFeatureSensitivity = createStruct(
  "Motion Sensing Sensitivity",
  (s) => ({
    status: s.field("Status", t.enum(MotionSensingFeatureSensitivityStatus)),
    sensitivy: s.field("Sensitivity", t.int()),
    sensitivity_max: s.field("Max Sensitivity", t.int()),
  })
);

export const MotionSensingFeatureSensitivityPut = createStruct(
  "Motion Sensing Sensitivity",
  (s) => ({
    sensitivity: s.field("Sensitivity", t.int()),
  })
);
