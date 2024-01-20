import { createEnum, createStruct } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { ResourceIdentifier, ResourceTypes } from "./resource";
import { IdentifyFeature } from "./feature";

export const DeviceArchetypes = createEnum("Device Archetypes", (e) => [
  e.variant("bridge_v2"),
  e.variant("unknown_archetype"),
  e.variant("classic_bulb"),
  e.variant("sultan_bulb"),
  e.variant("flood_bulb"),
  e.variant("spot_bulb"),
  e.variant("candle_bulb"),
  e.variant("luster_bulb"),
  e.variant("pendant_round"),
  e.variant("pendant_long"),
  e.variant("ceiling_round"),
  e.variant("ceiling_square"),
  e.variant("floor_shade"),
  e.variant("floor_lantern"),
  e.variant("table_shade"),
  e.variant("recessed_ceiling"),
  e.variant("recessed_floor"),
  e.variant("single_spot"),
  e.variant("double_spot"),
  e.variant("table_wash"),
  e.variant("wall_lantern"),
  e.variant("wall_shade"),
  e.variant("flexible_lamp"),
  e.variant("ground_spot"),
  e.variant("wall_spot"),
  e.variant("plug"),
  e.variant("hue_go"),
  e.variant("hue_lightstrip"),
  e.variant("hue_iris"),
  e.variant("hue_bloom"),
  e.variant("bollard"),
  e.variant("wall_washer"),
  e.variant("hue_play"),
  e.variant("vintage_bulb"),
  e.variant("christmas_tree"),
  e.variant("string_light"),
  e.variant("hue_centris"),
  e.variant("hue_lightstrip_tv"),
  e.variant("hue_lightstrip_pc"),
  e.variant("hue_tube"),
  e.variant("hue_signe"),
  e.variant("pendant_spot"),
  e.variant("ceiling_horizontal"),
  e.variant("ceiling_tube"),
]);

export const DeviceProductData = createStruct("Device Product Data", (s) => ({
  model_id: s.field("Model ID", t.string()),
  manufacturer_name: s.field("Manufacturer Name", t.string()),
  product_name: s.field("Product Name", t.string()),
  product_archetype: s.field("Product Archetype", t.enum(DeviceArchetypes)),
  certified: s.field("Certified", t.bool()),
  software_version: s.field("Software Version", t.string()),
  hardware_platform_type: s.field(
    "Hardware Platform Type",
    t.option(t.string())
  ),
}));

export const DeviceMetadata = createStruct("Device Metadata", (s) => ({
  archetype: s.field("Archetype", t.enum(DeviceArchetypes)),
  name: s.field("Name", t.string()),
}));

export const DeviceMetadataPut = createStruct("Device Metadata", (s) => ({
  archetype: s.field("Archetype", t.option(t.enum(DeviceArchetypes))),
  name: s.field("Name", t.option(t.string())),
}));

export const UserTestStatus = createEnum("status", (e) => [
  e.variant("set"),
  e.variant("changing"),
]);

export const UserTest = createStruct("User Test", (s) => ({
  status: s.field("Status", t.enum(UserTestStatus)),
  usertest: s.field("User Test", t.bool()),
}));

export const Device = createStruct("Device", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  services: s.field("Services", t.list(t.struct(ResourceIdentifier))),
  product_data: s.field("Product Data", t.struct(DeviceProductData)),
  metadata: s.field("Metadata", t.struct(DeviceMetadata)),
  type: s.field("Type", t.enum(ResourceTypes)),
  usertest: s.field("User Test", t.struct(UserTest)),
}));

export const DevicePut = createStruct("Device", (s) => ({
  metadata: s.field("Metadata", t.option(t.struct(DeviceMetadataPut))),
  identify: s.field("Identify", t.option(t.struct(IdentifyFeature))),
}));

export const BatteryState = createEnum("Battery State", (e) => [
  e.variant("normal"),
  e.variant("low"),
  e.variant("critical"),
]);

export const PowerState = createStruct("Power State", (s) => ({
  battery_level: s.field("Battery Level", t.option(t.int())),
  battery_state: s.field("Battery State", t.option(t.enum(BatteryState))),
}));

export const DevicePower = createStruct("Device Power", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  owner: s.field("Owner", t.struct(ResourceIdentifier)),
  power_state: s.field("Power State", t.struct(PowerState)),
  type: s.field("Type", t.enum(ResourceTypes)),
}));
