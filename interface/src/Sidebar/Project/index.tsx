import type { Graph, GraphFunction, Project, Queue } from "@macrograph/runtime";

import { CustomTypes } from "./CustomTypes";
import { Functions } from "./Functions";
import { Graphs } from "./Graphs";
import { Packages } from "./Packages";
import { Console } from "./PrintOutput";
import { Queues } from "./Queues";
import { Resources } from "./Resources";
import { Variables } from "./Variables";
import { Viewers } from "./Viewers";

export function Sidebar(props: {
	project: Project;
	currentGraph?: Graph;
	onGraphClicked(graph: Graph): void;
	onFunctionClicked?(fn: GraphFunction): void;
	onQueueClicked?(queue: Queue): void;
	onPackageClicked?(pkg: { name: string }): void;
}) {
	return (
		<>
			<Graphs
				currentGraph={props.currentGraph?.id}
				onGraphClicked={props.onGraphClicked}
			/>
			<Functions onFunctionClicked={(fn) => props.onFunctionClicked?.(fn)} />
			<Console />
			<Variables project={props.project} />
			<Queues
				project={props.project}
				onQueueClicked={(queue) => props.onQueueClicked?.(queue)}
			/>
			<Packages onPackageClicked={props.onPackageClicked} />
			<CustomTypes />
			<Resources />
			<Viewers />
		</>
	);
}
