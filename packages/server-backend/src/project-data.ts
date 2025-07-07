import { type Node, Graph } from "@macrograph/server-domain";

export type NodeConnections = {
	in?: Map<string, Array<[Node.Id, string]>>;
	out?: Map<string, Array<[Node.Id, string]>>;
};

export type Project = {
	name: string;
	graphs: Map<
		Graph.Id,
		{
			id: Graph.Id;
			name: string;
			nodes: Array<
				{
					id: Node.Id;
					name?: string;
					position: { x: number; y: number };
					schema: { pkgId: string; schemaId: string };
				} & DeepWriteable<Node.IO>
			>;
			connections?: Map<Node.Id, NodeConnections>;
		}
	>;
};

export const project: Project = {
	name: "",
	graphs: new Map([
		[
			Graph.Id.make(0),
			{
				id: Graph.Id.make(0),
				name: "New Graph",
				nodes: [],
			},
		],
	]),
};
