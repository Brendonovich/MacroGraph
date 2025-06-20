import { ProjectRpcs } from "./domain/Project/rpc";
import { GraphRpcs } from "./domain/Graph/rpc";
import { NodeRpcs } from "./domain/Node/rpc";
import { PresenceRpcs } from "./domain/Presence/rpc";

export const Rpcs = ProjectRpcs.merge(PresenceRpcs, GraphRpcs, NodeRpcs);
