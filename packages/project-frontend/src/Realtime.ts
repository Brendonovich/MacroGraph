import { Context, Stream } from "effect";
import { ProjectEvent } from "@macrograph/project-domain";

export class ProjectRealtime extends Context.Tag("ProjectRealtime")<
	ProjectRealtime,
	{
		id: number;
		token: string;
		stream: Stream.Stream<ProjectEvent>;
	}
>() {}
