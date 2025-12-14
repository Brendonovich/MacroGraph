import { Layer } from "effect";
import { ProjectRequestHandler, ProjectUILayers } from "@macrograph/project-ui";

import { PlaygroundRpc } from "./rpc";

const RequestHandlersLive = Layer.effect(ProjectRequestHandler, PlaygroundRpc);

export const FrontendLive = ProjectUILayers.pipe(
	Layer.provideMerge(RequestHandlersLive),
	Layer.provideMerge(PlaygroundRpc.Default),
);
