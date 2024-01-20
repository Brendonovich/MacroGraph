import { createEnum, createStruct } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { ResourceTypes } from "./resource";

export const MatterAction = createEnum("Matter Action", (e) => [
  e.variant(""),
  e.variant("reset"),
]);

export const Matter = createStruct("Matter", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  max_fabrics: s.field("Max Fabrics", t.int()),
  has_qr_code: s.field("Has QR Code", t.bool()),
  type: s.field("Type", t.enum(ResourceTypes)),
}));

export const MatterPut = createStruct("Matter", (s) => ({
  action: s.field("Action", t.option(t.enum(MatterAction))),
}));

export const MatterFabricStatus = createEnum("MatterFabric Status", (e) => [
  e.variant("pending"),
  e.variant("paired"),
  e.variant("timedout"),
]);

export const MatterFabricData = createStruct("MatterFabric Data", (s) => ({
  label: s.field("Label", t.string()),
  vendor_id: s.field("Vendor ID", t.int()),
}));

export const MatterFabric = createStruct("MatterFabric", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  status: s.field("Status", t.enum(MatterFabricStatus)),
  fabric_data: s.field(
    "MatterFabric Data",
    t.option(t.struct(MatterFabricData))
  ),
  creation_time: s.field("Creation Time", t.option(t.string())),
  type: s.field("Type", t.enum(ResourceTypes)),
}));
