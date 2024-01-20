import { createStruct } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { ResourceIdentifier, ResourceTypes } from "./resource";

export const TimeZone = createStruct("TimeZone", (s) => ({
  time_zone: s.field("TimeZone", t.string()),
}));

export const Bridge = createStruct("Bridge", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  bridge_id: s.field("Bridge ID", t.string()),
  time_zone: s.field("TimeZone", t.struct(TimeZone)),
  type: s.field("Type", t.enum(ResourceTypes)),
}));

export const BridgeHome = createStruct("Bridge Home", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  services: s.field("Services", t.list(t.struct(ResourceIdentifier))),
  children: s.field("Children", t.list(t.struct(ResourceIdentifier))),
  type: s.field("Type", t.enum(ResourceTypes)),
}));
