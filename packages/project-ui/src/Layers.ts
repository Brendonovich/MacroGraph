import { Layer } from "effect";

import { ProjectActions } from "./Actions";
import { PackageClients } from "./Packages/Clients";
import {
	ProjectEventHandler,
	ProjectEventStreamHandlerLive,
} from "./ProjectEventHandler";
import { ProjectState } from "./State";

export const ProjectUILayers = Layer.provideMerge(
	ProjectEventStreamHandlerLive,
	Layer.mergeAll(
		PackageClients.Default,
		ProjectActions.Default,
		ProjectState.Default,
		ProjectEventHandler.Default,
	),
);
