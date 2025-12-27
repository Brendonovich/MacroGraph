import { RequestResolver } from "effect";
import { Actor } from "@macrograph/project-domain";

import * as ProjectRuntime from "./ProjectRuntime";

export const requestResolverServices = RequestResolver.contextFromServices(
	ProjectRuntime.Current,
	Actor.Current,
);
