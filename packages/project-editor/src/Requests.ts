import { RequestResolver } from "effect";
import { Actor } from "@macrograph/project-domain";

import { NodesIOStore } from "./NodesIOStore";
import { ProjectEditor } from "./ProjectEditor";

export const requestResolverServices = RequestResolver.contextFromServices(
	Actor.Current,
	NodesIOStore,
	ProjectEditor,
);
