import { createEnum, createStruct } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { ResourceIdentifier, ResourceTypes } from "./resource";
import { Position } from "./feature";

export const Segment = createStruct("Segment", (s) => ({
  length: s.field("Length", t.int()),
  start: s.field("Start", t.int()),
}));

export const SegmentReference = createStruct("Segment Reference", (s) => ({
  service: s.field("Service", t.struct(ResourceIdentifier)),
  index: s.field("Index", t.int()),
}));

export const EntertainmentChannel = createStruct(
  "Entertainment Channel",
  (s) => ({
    channel_id: s.field("Channel ID", t.int()),
    position: s.field("Position", t.struct(Position)),
    members: s.field("Members", t.list(t.struct(SegmentReference))),
  })
);

export const EntertainmentConfigurationType = createEnum(
  "Entertainment Configuration Type",
  (e) => [
    e.variant("screen"),
    e.variant("music"),
    e.variant("3dspace"),
    e.variant("other"),
    e.variant("monitor"),
  ]
);

export const EntertainmentStatus = createEnum("Entertainment Status", (e) => [
  e.variant("active"),
  e.variant("inactive"),
]);

export const StreamingProxyMode = createEnum("Streaming Proxy Mode", (e) => [
  e.variant("auto"),
  e.variant("manual"),
]);

export const StreamingProxy = createStruct("Streaming Proxy", (s) => ({
  mode: s.field("Mode", t.enum(StreamingProxyMode)),
  node: s.field("Node", t.struct(ResourceIdentifier)),
}));

export const ServiceLocation = createStruct("Service Location", (s) => ({
  service: s.field("Service", t.struct(ResourceIdentifier)),
  positions: s.field("Positions", t.list(t.struct(Position))),
  position: s.field("Position", t.option(t.struct(Position))),
}));

export const EntertainmentLocations = createStruct(
  "Entertainment Locations",
  (s) => ({
    service_locations: s.field(
      "Service Locations",
      t.list(t.struct(ServiceLocation))
    ),
  })
);

export const EntertainmentConfigurationAction = createEnum(
  "EntertainmentConfigurationAction",
  (e) => [e.variant("start"), e.variant("stop")]
);

export const EntertainmentConfigurationMetadata = createStruct(
  "Entertainment Configuration Metadata",
  (s) => ({
    name: s.field("Name", t.string()),
  })
);

export const EntertainmentConfiguration = createStruct(
  "Entertainment Configuration",
  (s) => ({
    id: s.field("ID", t.string()),
    id_v1: s.field("ID (v1)", t.option(t.string())),
    metadata: s.field("Metadata", t.struct(EntertainmentConfigurationMetadata)),
    configuration_type: s.field(
      "Configuration Type",
      t.enum(EntertainmentConfigurationType)
    ),
    status: s.field("Status", t.enum(EntertainmentStatus)),
    stream_proxy: s.field("Stream Proxy", t.struct(StreamingProxy)),
    channels: s.field("Channels", t.list(t.struct(EntertainmentChannel))),
    locations: s.field("Locations", t.struct(EntertainmentLocations)),
    light_services: s.field(
      "Light Services",
      t.option(t.list(t.struct(ResourceIdentifier)))
    ),
    active_streamer: s.field(
      "Active Streamer",
      t.option(t.struct(ResourceIdentifier))
    ),
    type: s.field("Type", t.enum(ResourceTypes)),
  })
);

export const SegmentationProperties = createStruct(
  "Segmentation Properties",
  (s) => ({
    configurable: s.field("Configurable", t.bool()),
    max_segments: s.field("Max Segments", t.int()),
    segments: s.field("Segments", t.list(t.struct(Segment))),
  })
);

export const Entertainment = createStruct("Entertainment", (s) => ({
  id: s.field("ID", t.string()),
  id_v1: s.field("ID (v1)", t.option(t.string())),
  owner: s.field("Owner", t.struct(ResourceIdentifier)),
  renderer: s.field("Renderer", t.bool()),
  proxy: s.field("Proxy", t.bool()),
  max_streams: s.field("Max Streams", t.option(t.int())),
  segments: s.field("Segments", t.option(t.struct(SegmentationProperties))),
  type: s.field("Type", t.enum(ResourceTypes)),
}));
