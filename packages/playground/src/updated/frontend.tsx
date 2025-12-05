import { Layer } from "effect";
import { ProjectUILayers } from "@macrograph/project-ui";

import { PlaygroundRpc } from "./rpc";

export const FrontendLive = Layer.mergeAll(
	ProjectUILayers,
	PlaygroundRpc.Default,
);
