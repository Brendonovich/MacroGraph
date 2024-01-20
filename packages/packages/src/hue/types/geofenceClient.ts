import { createEnum, createStruct } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { ResourceTypes } from "./resource";

export const GeofenceClient = createStruct("Geofence Client", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  name: s.field("Name", t.string()),
  type: s.field("Type", t.enum(ResourceTypes)),
}));

export const GeofenceClientPut = createStruct("Geofence Client", (s) => ({
  is_at_home: s.field("Is At Home", t.option(t.bool())),
  name: s.field("Name", t.option(t.string())),
}));

export const GeofenceClientPost = createStruct("Geofence Client", (s) => ({
  is_at_home: s.field("Is At Home", t.option(t.bool())),
  name: s.field("Name", t.option(t.string())),
  type: s.field("Type", t.enum(ResourceTypes)),
}));
