import { Node } from "@macrograph/project-domain";

export type GraphTwoWayConnections = Record<
	Node.Id,
	{
		in?: Record<string, Array<[Node.Id, string]>>;
		out?: Record<string, Array<[Node.Id, string]>>;
	}
>;
