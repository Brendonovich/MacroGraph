import { createEnum, createStruct } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { ResourceIdentifier, ResourceTypes } from "./resource";
import {
  MotionSensingFeature,
  MotionSensingFeatureSensitivity,
  MotionSensingFeatureSensitivityPut,
} from "./feature";

export const ButtonEvent = createEnum("Button Event", (e) => [
  e.variant("initial_press"),
  e.variant("repeat"),
  e.variant("short_release"),
  e.variant("long_press"),
  e.variant("long_release"),
  e.variant("double_short_release"),
  e.variant("unknown"),
]);

export const ButtonReport = createStruct("Button Report", (s) => ({
  updated: s.field("Updated", t.string()),
  event: s.field("Event", t.enum(ButtonEvent)),
}));

export const ButtonFeature = createStruct("Button Feature", (s) => ({
  button_report: s.field("Button Report", t.option(t.struct(ButtonReport))),
  last_event: s.field("Last Event", t.option(t.enum(ButtonEvent))),
  repeat_interval: s.field("Repeat Interval", t.option(t.int())),
  event_values: s.field("Event Values", t.option(t.list(t.enum(ButtonEvent)))),
}));

export const ButtonMetadata = createStruct("Button Metadata", (s) => ({
  control_id: s.field("Control ID", t.int()),
}));

export const Button = createStruct("Button", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  owner: s.field("Owner", t.struct(ResourceIdentifier)),
  metadata: s.field("Metadata", t.struct(ButtonMetadata)),
  button: s.field("Button Feature", t.option(t.struct(ButtonFeature))),
  type: s.field("Type", t.enum(ResourceTypes)),
}));

export const CameraMotion = createStruct("Camera Motion", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  owner: s.field("Owner", t.struct(ResourceIdentifier)),
  enabled: s.field("Enabled", t.bool()),
  motion: s.field("Motion", t.struct(MotionSensingFeature)),
  sensitivity: s.field(
    "Sensitivity",
    t.option(t.struct(MotionSensingFeatureSensitivity))
  ),
  type: s.field("Type", t.enum(ResourceTypes)),
}));

export const CameraMotionPut = createStruct("Camera Motion", (s) => ({
  enabled: s.field("Enabled", t.option(t.bool())),
  sensitivty: s.field(
    "Sensitivity",
    t.option(t.struct(MotionSensingFeatureSensitivityPut))
  ),
}));

export const ContactState = createEnum("Contact State", (e) => [
  e.variant("contact"),
  e.variant("no_contact"),
]);

export const ContactReport = createStruct("Contact Report", (s) => ({
  changed: s.field("Changed", t.string()),
  state: s.field("State", t.enum(ContactState)),
}));

export const Contact = createStruct("Contact", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  owner: s.field("Owner", t.struct(ResourceIdentifier)),
  enabled: s.field("Enabled", t.bool()),
  contact_report: s.field("Contact Report", t.option(t.struct(ContactReport))),
  type: s.field("Type", t.enum(ResourceTypes)),
}));

export const ContactPut = createStruct("Contact", (s) => ({
  enabled: s.field("Enabled", t.option(t.bool())),
}));

export const LightLevelReport = createStruct("Light Level Report", (s) => ({
  changed: s.field("Changed", t.string()),
  light_level: s.field("Light Level", t.int()),
}));

export const LightLevelFeature = createStruct("Light Level Feature", (s) => ({
  light_level_report: s.field(
    "Light Level Report",
    t.option(t.struct(LightLevelReport))
  ),
  light_level: s.field("Light Level", t.option(t.int())),
  light_level_valid: s.field("Light Level Valid", t.option(t.bool())),
}));

export const LightLevel = createStruct("Light Level", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  owner: s.field("Owner", t.struct(ResourceIdentifier)),
  enabled: s.field("Enabled", t.bool()),
  light: s.field("Light", t.struct(LightLevelFeature)),
  type: s.field("Type", t.enum(ResourceTypes)),
}));

export const LightLevelPut = createStruct("Light Level", (s) => ({
  enabled: s.field("Enabled", t.option(t.bool())),
}));

export const Motion = createStruct("Motion", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  owner: s.field("Owner", t.struct(ResourceIdentifier)),
  enabled: s.field("Enabled", t.bool()),
  motion: s.field("Motion Sensing", t.struct(MotionSensingFeature)),
  sensitivity: s.field(
    "Motion Sensitivity",
    t.option(t.struct(MotionSensingFeatureSensitivity))
  ),
  type: s.field("Type", t.enum(ResourceTypes)),
}));

export const MotionPut = createStruct("Motion", (s) => ({
  enabled: s.field("Enabled", t.option(t.bool())),
  sensitivity: s.field(
    "Motion Sensitivity",
    t.option(t.struct(MotionSensingFeatureSensitivityPut))
  ),
}));

export const RelativeRotaryAction = createEnum(
  "Relative Rotary Action",
  (e) => [e.variant("start"), e.variant("repeat"), e.variant("unknown")]
);

export const RelativeRotaryDirection = createEnum(
  "Relative Rotary Direction",
  (e) => [e.variant("clock_wise"), e.variant("counter_clock_wise")]
);

export const RelativeRotaryRotation = createStruct(
  "Relative Rotary Rotation",
  (s) => ({
    direction: s.field("Direction", t.enum(RelativeRotaryDirection)),
    duration: s.field("Duration", t.int()),
    steps: s.field("Steps", t.int()),
  })
);

export const RelativeRotaryEvent = createStruct(
  "Relative Rotary Event",
  (s) => ({
    action: s.field("Action", t.enum(RelativeRotaryAction)),
    rotation: s.field("Rotation", t.struct(RelativeRotaryRotation)),
  })
);

export const RelativeRotaryReport = createStruct(
  "Relative Rotary Report",
  (s) => ({
    ...RelativeRotaryEvent.fields,
    updated: s.field("Updated", t.string()),
  })
);

export const RelativeRotaryFeature = createStruct(
  "Relative Rotary Feature",
  (s) => ({
    rotary_report: s.field(
      "Rotary Report",
      t.option(t.struct(RelativeRotaryReport))
    ),
    last_event: s.field("Last Event", t.option(t.struct(RelativeRotaryEvent))),
  })
);

export const RelativeRotary = createStruct("Relative Rotary", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  owner: s.field("Owner", t.struct(ResourceIdentifier)),
  relative_rotary: s.field(
    "Relative Rotary Feature",
    t.option(t.struct(RelativeRotaryFeature))
  ),
  type: s.field("Type", t.enum(ResourceTypes)),
}));

export const TamperState = createEnum("Tamper State", (e) => [
  e.variant("tampered"),
  e.variant("not_tampered"),
]);

export const TamperSource = createEnum("Tamper Source", (e) => [
  e.variant("battery_door"),
  e.variant("unknown"),
]);

export const TamperReport = createStruct("Tamper Report", (s) => ({
  changed: s.field("Changed", t.string()),
  source: s.field("Source", t.enum(TamperSource)),
  state: s.field("State", t.enum(TamperState)),
}));

export const Tamper = createStruct("Tamper", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
}));

export const TemperatureReport = createStruct("Temperature Report", (s) => ({
  changed: s.field("Changed", t.string()),
  temperature: s.field("Temperature", t.float()),
}));

export const TemperatureSensingFeature = createStruct(
  "Temperature Sensing Feature",
  (s) => ({
    temperature_report: s.field(
      "Temperature Report",
      t.option(t.struct(TemperatureReport))
    ),
    temperature: s.field("Temperature", t.option(t.float())),
    temperature_valid: s.field("Temperature Valid", t.option(t.float())),
  })
);

export const Temperature = createStruct("Temperature", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  owner: s.field("Owner", t.struct(ResourceIdentifier)),
  enabled: s.field("Enabled", t.bool()),
  temperature: s.field("Temperature", t.struct(TemperatureSensingFeature)),
  type: s.field("Type", t.enum(ResourceTypes)),
}));

export const TemperaturePut = createStruct("Temperature", (s) => ({
  enabled: s.field("enabled", t.option(t.bool())),
}));
