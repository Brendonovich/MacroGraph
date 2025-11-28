import { Context, type Stream } from "effect";
import type { ProjectEvent } from "@macrograph/project-domain/updated";

export class ProjectRealtime extends Context.Tag("ProjectRealtime")<
	ProjectRealtime,
	{
		id: number;
		token: string;
		stream: Stream.Stream<ProjectEvent>;
	}
>() {}
