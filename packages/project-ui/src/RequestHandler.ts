import { Context, type Effect, type Request as ERequest } from "effect";
import type { Request } from "@macrograph/project-domain/updated";

export class ProjectRequestHandler extends Context.Tag("ProjectRequestHandler")<
	ProjectRequestHandler,
	{
		[K in Request.Request["_tag"]]: (
			r: Extract<Request.Request, { _tag: K }>,
		) => Effect.Effect<ERequest.Request.Success<typeof r>, unknown, never>;
	}
>() {}
