import { Policy, ProjectRpcs } from "@macrograph/server-domain";
import { ProjectRequests } from "@macrograph/project-backend";
import { Effect } from "effect";

import { ServerPolicy } from "../ServerPolicy";

export const ProjectRpcsLive = ProjectRpcs.toLayer(
	Effect.gen(function* () {
		const reqs = yield* ProjectRequests;
		const serverPolicy = yield* ServerPolicy;

		return {
			GetProject: Effect.request(reqs.GetProjectResolver),
			GetPackageSettings: (v) =>
				Effect.request(v, reqs.GetPackageSettingsResolver).pipe(
					Policy.withPolicy(serverPolicy.isOwner),
				),
		};
	}),
);
