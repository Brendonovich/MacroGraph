import type { Graph, Project } from "@macrograph/runtime";

import { CustomTypes } from "./CustomTypes";
import { Functions } from "./Functions";
import { Graphs } from "./Graphs";
import { PrintOutput } from "./PrintOutput";
import { Resources } from "./Resources";
import { Variables } from "./Variables";
import { Viewers } from "./Viewers";

export function Sidebar(props: {
	project: Project;
	currentGraph?: Graph;
	onGraphClicked(graph: Graph): void;
}) {
	return (
		<>
			<Graphs
				currentGraph={props.currentGraph?.id}
				onGraphClicked={props.onGraphClicked}
			/>
			<Functions onFunctionClicked={(graphId) => {
				const graph = props.project.graphs.get(graphId);
				if (graph) props.onGraphClicked(graph);
			}} />
			<PrintOutput />
			<Variables project={props.project} />
			<CustomTypes />
			<Resources />
			<Viewers />
		</>
	);
}
