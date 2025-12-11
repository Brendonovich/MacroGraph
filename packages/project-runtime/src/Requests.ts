import { RequestResolver } from "effect";

import * as Actor from "./Actor";
import * as ProjectRuntime from "./ProjectRuntime";

export const requestResolverServices = RequestResolver.contextFromServices(
	ProjectRuntime.Current,
	Actor.Current,
);
