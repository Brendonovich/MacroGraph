import { RequestResolver } from "effect";
import { Actor, NodesIOStore } from "@macrograph/project-domain";

import { ProjectEditor } from "./ProjectEditor";

export const requestResolverServices = RequestResolver.contextFromServices(
	Actor.Current,
	NodesIOStore,
	ProjectEditor,
);
