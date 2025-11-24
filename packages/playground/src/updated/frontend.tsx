import { Layer } from "effect";
import {
	PackageClients,
	ProjectActions,
	ProjectState,
} from "@macrograph/project-ui";

import { PlaygroundRpc } from "./rpc";

export const FrontendLayers = Layer.mergeAll(
	PackageClients.Default,
	PlaygroundRpc.Default,
	ProjectActions.Default,
	ProjectState.Default,
	Layer.scope,
);
