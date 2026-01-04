import { RequestResolver } from "effect";
import { Actor } from "@macrograph/project-domain";

import { ProjectEditor } from "./Editor/ProjectEditor";
import { NodesIOStore } from "./NodesIOStore";

export const requestResolverServices = RequestResolver.contextFromServices(
	Actor.Current,
	NodesIOStore,
	ProjectEditor,
);
