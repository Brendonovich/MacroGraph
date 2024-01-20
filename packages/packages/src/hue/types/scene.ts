import { createEnum, createStruct } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { ResourceIdentifier, ResourceTypes } from "./resource";
import {
  ColorFeatureBase,
  ColorTemperatureFeatureBase,
  DimmingFeatureBase,
  DynamicsFeaturePut,
  GradientFeatureBase,
  OnFeature,
  PaletteFeature,
  RecallFeature,
  SceneEffectsFeature,
} from "./feature";

export const ActionAction = createStruct("Action Action", (s) => ({
  on: s.field("On", t.option(t.struct(OnFeature))),
  dimming: s.field("Dimming", t.option(t.struct(DimmingFeatureBase))),
  color: s.field("Color", t.option(t.struct(ColorFeatureBase))),
  color_temperature: s.field(
    "Color Temperature",
    t.option(t.struct(ColorTemperatureFeatureBase))
  ),
  gradient: s.field("Gradient", t.option(t.struct(GradientFeatureBase))),
  effects: s.field("Effects", t.option(t.struct(SceneEffectsFeature))),
  dynamics: s.field("Dynamics", t.option(t.struct(DynamicsFeaturePut))),
}));

export const Action = createStruct("Action", (s) => ({
  target: s.field("Target", t.struct(ResourceIdentifier)),
  action: s.field("Action", t.struct(ActionAction)),
}));

export const SceneMetadata = createStruct("Scene Metadata", (s) => ({
  name: s.field("Name", t.string()),
  image: s.field("Image", t.option(t.struct(ResourceIdentifier))),
}));

export const SceneMetadataPut = createStruct("Scene Metadata", (s) => ({
  name: s.field("Name", t.string()),
}));

export const Scene = createStruct("Scene", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  metadata: s.field("Metadata", t.struct(SceneMetadata)),
  group: s.field("Group", t.struct(ResourceIdentifier)),
  actions: s.field("Actions", t.list(t.struct(Action))),
  palette: s.field("Palette", t.option(t.struct(PaletteFeature))),
  speed: s.field("Speed", t.float()),
  auto_dynamic: s.field("Auto Dynamic", t.option(t.bool())),
  type: s.field("Type", t.enum(ResourceTypes)),
}));

export const ScenePut = createStruct("Scene", (s) => ({
  metadata: s.field("Metadata", t.option(t.struct(SceneMetadataPut))),
  actions: s.field("Actions", t.option(t.list(t.struct(Action)))),
  palette: s.field("Palette", t.option(t.struct(PaletteFeature))),
  recall: s.field("Recall", t.option(t.struct(RecallFeature))),
  speed: s.field("Speed", t.option(t.float())),
  auto_dynamic: s.field("Auto Dynamic", t.option(t.bool())),
}));

export const ScenePost = createStruct("Scene", (s) => ({
  metadata: s.field("Metadata", t.struct(SceneMetadata)),
  group: s.field("Group", t.struct(ResourceIdentifier)),
  actions: s.field("Actions", t.list(t.struct(Action))),
  palette: s.field("Palette", t.option(t.struct(PaletteFeature))),
  speed: s.field("Speed", t.option(t.float())),
  auto_dynamic: s.field("Auto Dynamic", t.option(t.bool())),
  type: s.field("Type", t.enum(ResourceTypes)),
}));

export const Weekday = createEnum("Weekday", (e) => [
  e.variant("sunday"),
  e.variant("monday"),
  e.variant("tuesday"),
  e.variant("wednesday"),
  e.variant("thursday"),
  e.variant("friday"),
  e.variant("saturay"),
]);

export const SmartSceneState = createEnum("Smart Scene State", (e) => [
  e.variant("active"),
  e.variant("inactive"),
]);

export const TimeslotStartTimeTime = createStruct(
  "Timeslot Start Time Time",
  (s) => ({
    hour: s.field("Hour", t.int()),
    minute: s.field("Minute", t.int()),
    second: s.field("Second", t.int()),
  })
);

export const TimeslotStartTime = createStruct("Timeslot Start Time", (s) => ({
  kind: s.field("Kind", t.string()),
  time: s.field("Time", t.struct(TimeslotStartTimeTime)),
}));

export const SmartSceneTimeslot = createStruct("Smart Scene Timeslot", (s) => ({
  start_time: s.field("Start Time", t.struct(TimeslotStartTime)),
  target: s.field("Target", t.struct(ResourceIdentifier)),
}));

export const DayTimeslots = createStruct("Day Timeslots", (s) => ({
  timeslots: s.field("Timeslots", t.list(t.struct(SmartSceneTimeslot))),
  recurrence: s.field("Recurrence", t.list(t.enum(Weekday))),
}));

export const SmartSceneActiveTimeslot = createStruct(
  "Smart Scene Active Timeslot",
  (s) => ({
    timeslot_id: s.field("Timeslot ID", t.int()),
    weekday: s.field("Weekday", t.enum(Weekday)),
  })
);

export const SmartSceneRecallAction = createEnum(
  "Smart Scene Recall Action",
  (e) => [e.variant("activate"), e.variant("deactivate")]
);

export const SmartSceneRecall = createStruct("Smart Scene Recall", (s) => ({
  action: s.field("Smart Scene Recall Action", t.enum(SmartSceneRecallAction)),
}));

export const SmartScene = createStruct("Smart Scene", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  metadata: s.field("Metadata", t.struct(SceneMetadata)),
  group: s.field("Group", t.struct(ResourceIdentifier)),
  week_timeslots: s.field("Week Timeslots", t.list(t.struct(DayTimeslots))),
  state: s.field("State", t.enum(SmartSceneState)),
  active_timeslot: s.field(
    "Active Timeslot",
    t.option(t.struct(SmartSceneActiveTimeslot))
  ),
  type: s.field("Type", t.enum(ResourceTypes)),
}));

export const SmartScenePut = createStruct("Smart Scene", (s) => ({
  metadata: s.field("Metadata", t.option(t.struct(SceneMetadataPut))),
  week_timeslots: s.field(
    "Week Timeslots",
    t.option(t.list(t.struct(DayTimeslots)))
  ),
  recall: s.field("Recall", t.option(t.struct(SmartSceneRecall))),
}));

export const SmartScenePost = createStruct("Smart Scene", (s) => ({
  metadata: s.field("Metadata", t.struct(SceneMetadata)),
  group: s.field("Group", t.struct(ResourceIdentifier)),
  week_timeslots: s.field("Week Timeslots", t.list(t.struct(DayTimeslots))),
  recall: s.field("Recall", t.option(t.struct(SmartSceneRecall))),
  type: s.field("Type", t.enum(ResourceTypes)),
}));
