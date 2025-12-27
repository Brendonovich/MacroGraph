import type { IO, Node } from "@macrograph/project-domain";

export type GraphTwoWayConnections = Record<
	Node.Id,
	{
		in?: Record<IO.Id, Array<[Node.Id, IO.Id]>>;
		out?: Record<IO.Id, Array<[Node.Id, IO.Id]>>;
	}
>;
