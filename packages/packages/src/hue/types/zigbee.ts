import { createEnum, createStruct } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { ResourceIdentifier, ResourceTypes } from "./resource";

export const ConnectivityServiceStatus = createEnum(
  "Connectivity Service Status",
  (e) => [
    e.variant("connected"),
    e.variant("disconnected"),
    e.variant("connectivity_issue"),
    e.variant("unidirectional_incoming"),
  ]
);

export const ZigbeeConnectivity = createStruct("Zigbee Connectivity", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  owner: s.field("Owner", t.struct(ResourceIdentifier)),
  status: s.field("Status", t.enum(ConnectivityServiceStatus)),
  mac_address: s.field("MAC Address", t.string()),
  type: s.field("Type", t.enum(ResourceTypes)),
}));

export const ZgpConnectivity = createStruct("Zgp Connectivity", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  status: s.field("Status", t.enum(ConnectivityServiceStatus)),
  source_id: s.field("Source ID", t.string()),
  type: s.field("Type", t.enum(ResourceTypes)),
}));
