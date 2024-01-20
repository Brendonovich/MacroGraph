import { createEnum, createStruct } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { ResourceIdentifier, ResourceTypes } from "./resource";
import { JSON } from "@macrograph/json";

export const BehaviorInstanceStatus = createEnum("Behavior Instance", (e) => [
  e.variant("initializing"),
  e.variant("running"),
  e.variant("disabled"),
  e.variant("errored"),
]);

export const BehaviorInstanceMetadata = createStruct(
  "Behavior Instance Metadata",
  (s) => ({
    name: s.field("Name", t.option(t.string())),
  })
);

export const DependencyLevel = createEnum("Dependency Level", (e) => [
  e.variant("non_critical"),
  e.variant("critical"),
]);

export const ResourceDependee = createStruct("Resource Dependee", (s) => ({
  target: s.field("Target", t.struct(ResourceIdentifier)),
  level: s.field("Level", t.enum(DependencyLevel)),
  type: s.field("Type", t.option(t.string())),
}));

export const BehaviorInstance = createStruct("Behavior Instance", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  script_id: s.field("Script ID", t.string()),
  enabled: s.field("Enabled", t.bool()),
  configuration: s.field("Configuration", t.enum(JSON)),
  dependees: s.field("Dependees", t.list(t.struct(ResourceDependee))),
  status: s.field("Status", t.enum(BehaviorInstanceStatus)),
  last_error: s.field("Last Error", t.string()),
  metadata: s.field("Metadata", t.struct(BehaviorInstanceMetadata)),
  state: s.field("State", t.option(t.enum(JSON))),
  migrated_from: s.field("Migrated From", t.option(t.string())),
  type: s.field("Type", t.enum(ResourceTypes)),
}));

export const BehaviorInstancePut = createStruct("Behavior Instance", (s) => ({
  enabled: s.field("Enabled", t.option(t.bool())),
  configuration: s.field("Configuration", t.option(t.enum(JSON))),
  trigger: s.field("Trigger", t.option(t.enum(JSON))),
  metadata: s.field("Metadata", t.option(t.struct(BehaviorInstanceMetadata))),
}));

export const behaviorInstancePost = createStruct("Behavior Instance", (s) => ({
  script_id: s.field("Script ID", t.string()),
  enabled: s.field("Enabled", t.bool()),
  configuration: s.field("Configuration", t.enum(JSON)),
  metadata: s.field("Metadata", t.option(t.struct(BehaviorInstanceMetadata))),
  migrated_from: s.field("Migrated From", t.option(t.string())),
}));

export const BehaviorScriptCategory = createEnum(
  "Behavior Script Category",
  (e) => [
    e.variant("automation"),
    e.variant("entertainment"),
    e.variant("accessory"),
    e.variant("other"),
  ]
);

export const BehaviorScriptMetadata = createStruct(
  "Behavior Script Metadata",
  (s) => ({
    name: s.field("Name", t.option(t.string())),
    category: s.field("Category", t.enum(BehaviorScriptCategory)),
  })
);

export const BehaviorScript = createStruct("Behavior Script", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  description: s.field("Description", t.string()),
  configuration_schema: s.field("Configuration Schema", t.enum(JSON)),
  trigger_schema: s.field("Trigger Schema", t.enum(JSON)),
  state_schema: s.field("State Schema", t.enum(JSON)),
  version: s.field("Version", t.string()),
  metadata: s.field("Metadata", t.struct(BehaviorScriptMetadata)),
  supported_features: s.field(
    "Supported Features",
    t.option(t.list(t.string()))
  ),
  max_number_instances: s.field("Max Number Instances", t.option(t.int())),
  type: s.field("Type", t.enum(ResourceTypes)),
}));
