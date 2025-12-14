import { RequestResolver } from "effect";
import { Actor } from "@macrograph/project-domain/updated";

import * as ProjectRuntime from "./ProjectRuntime";

export const requestResolverServices = RequestResolver.contextFromServices(
	ProjectRuntime.Current,
	Actor.Current,
);
