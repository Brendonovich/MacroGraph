import { Layer } from "effect";

import { ProjectActions } from "./Actions";
import {
	EditorEventHandler,
	EditorEventStreamHandlerLive,
} from "./EditorEventHandler";
import { EditorState } from "./EditorState";
import { PackageClients } from "./Packages/Clients";
import {
	RuntimeEventHandler,
	RuntimeEventStreamHandlerLive,
} from "./RuntimeEventHandler";
import { RuntimeState } from "./RuntimeState";

export const ProjectUILayers = Layer.provideMerge(
	Layer.mergeAll(EditorEventStreamHandlerLive, RuntimeEventStreamHandlerLive),
	Layer.mergeAll(
		PackageClients.Default,
		ProjectActions.Default,
		EditorState.Default,
		RuntimeState.Default,
		EditorEventHandler.Default,
		RuntimeEventHandler.Default,
	),
);
