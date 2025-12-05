import { Layer } from "effect";

import { ProjectActions } from "./Actions";
import { PackageClients } from "./Packages/Clients";
import { ProjectEventHandlerLive } from "./ProjectEventHandler";
import { ProjectState } from "./State";

export const ProjectUILayers = Layer.provideMerge(
	ProjectEventHandlerLive,
	Layer.mergeAll(
		PackageClients.Default,
		ProjectActions.Default,
		ProjectState.Default,
	),
);
