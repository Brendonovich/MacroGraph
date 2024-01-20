import { createEnum, createStruct } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { ResourceTypes } from "./resource";

export const HomekitStatus = createEnum("Homekit Status", (e) => [
  e.variant("pairing"),
  e.variant("paired"),
  e.variant("unpaired"),
]);

export const HomekitAction = createEnum("Homekit Action", (e) => [
  e.variant(""),
  e.variant("reset"),
]);

export const Homekit = createStruct("Homekit", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  status: s.field("Status", t.enum(HomekitStatus)),
  type: s.field("Type", t.enum(ResourceTypes)),
}));

export const HomekitPut = createStruct("Homekit", (s) => ({
  action: s.field("Action", t.option(t.enum(HomekitAction))),
}));
