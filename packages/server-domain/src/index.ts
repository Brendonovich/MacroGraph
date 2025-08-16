export * as Graph from "./Graph";
export * as Node from "./Node";
export * as IO from "./IO";
export * as Realtime from "./Realtime";
export * as Project from "./Project";
export * as Presence from "./Presence";
export * as ClientAuth from "./ClientAuth";
export * as CloudAuth from "./CloudAuth";

export * from "./util";
export * from "./errors";
export * from "./event";
export * from "./Permissions";

import * as ClientAuth from "./ClientAuth";
import * as CloudAuth from "./CloudAuth";
import * as Graph from "./Graph";
import * as Node from "./Node";
import * as Presence from "./Presence";
import * as Project from "./Project";

export const Rpcs = Project.Rpcs.merge(
	Presence.Rpcs,
	Graph.Rpcs,
	Node.Rpcs,
	CloudAuth.Rpcs,
	ClientAuth.Rpcs,
);
