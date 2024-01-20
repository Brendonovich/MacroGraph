import { createEnum, createStruct } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { ResourceIdentifier, ResourceTypes } from "./resource";

export const RoomArchetype = createEnum("Room Archetype", (e) => [
  e.variant("living_room"),
  e.variant("kitchen"),
  e.variant("dining"),
  e.variant("bedroom"),
  e.variant("kids_bedroom"),
  e.variant("bathroom"),
  e.variant("nursery"),
  e.variant("recreation"),
  e.variant("office"),
  e.variant("gym"),
  e.variant("hallway"),
  e.variant("toilet"),
  e.variant("front_door"),
  e.variant("garage"),
  e.variant("terrace"),
  e.variant("garden"),
  e.variant("driveway"),
  e.variant("carport"),
  e.variant("home"),
  e.variant("downstairs"),
  e.variant("upstairs"),
  e.variant("top_floor"),
  e.variant("attic"),
  e.variant("guest_room"),
  e.variant("staircase"),
  e.variant("lounge"),
  e.variant("man_cave"),
  e.variant("computer"),
  e.variant("studio"),
  e.variant("music"),
  e.variant("tv"),
  e.variant("reading"),
  e.variant("closet"),
  e.variant("storage"),
  e.variant("laundry_room"),
  e.variant("balcony"),
  e.variant("porch"),
  e.variant("barbecue"),
  e.variant("pool"),
  e.variant("other"),
]);

export const RoomMetadata = createStruct("Room Metadata", (s) => ({
  archetype: s.field("Archetype", t.enum(RoomArchetype)),
  name: s.field("Name", t.string()),
}));

export const RoomMetadataPut = createStruct("Room Metadata", (s) => ({
  archetype: s.field("Archetype", t.option(t.enum(RoomArchetype))),
  name: s.field("Name", t.option(t.string())),
}));

export const Room = createStruct("Room", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  services: s.field("Services", t.list(t.struct(ResourceIdentifier))),
  metadata: s.field("Metadata", t.struct(RoomMetadata)),
  children: s.field("Children", t.list(t.struct(ResourceIdentifier))),
  type: s.field("Type", t.enum(ResourceTypes)),
}));

export const RoomPut = createStruct("Room", (s) => ({
  children: s.field("Children", t.option(t.list(t.struct(ResourceIdentifier)))),
  metadata: s.field("Metadata", t.option(t.struct(RoomMetadataPut))),
}));

export const RoomPost = createStruct("Room", (s) => ({
  children: s.field("Children", t.list(t.struct(ResourceIdentifier))),
  metadata: s.field("Metadata", t.struct(RoomMetadataPut)),
}));

// Zone endpoints are same as Room, but return ResourceType "zone"
