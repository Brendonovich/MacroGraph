import { Effect, type Request, Stream } from "effect";
import { createScopedEffect, LoadingBlock } from "@macrograph/package-sdk/ui";
import { Project } from "@macrograph/project-domain";
import { queryOptions, type UseQueryResult } from "@tanstack/solid-query";
import { Suspense } from "solid-js";
import { reconcile } from "solid-js/store";
import { Dynamic } from "solid-js/web";

import type { PackageClient } from "./Clients";

export function PackageSettings(props: {
	packageClient: PackageClient;
	settingsQuery: UseQueryResult<
		Request.Request.Success<Project.GetPackageSettings>
	>;
}) {
	createScopedEffect(() =>
		props.packageClient.settingsChanges.pipe(
			Effect.flatMap(
				Stream.runForEach(() =>
					Effect.sync(() => props.settingsQuery.refetch()),
				),
			),
		),
	);

	return (
		<div class="flex flex-col items-stretch w-full max-w-120 p-4">
			<Suspense fallback={<LoadingBlock />}>
				<Dynamic
					component={props.packageClient.SettingsUI}
					rpc={props.packageClient.rpcClient}
					state={props.settingsQuery.data}
				/>
			</Suspense>
		</div>
	);
}

export const packageSettingsQueryOptions = (
	packageId: string,
	execute: (
		r: Project.GetPackageSettings,
	) => Promise<Request.Request.Success<Project.GetPackageSettings>>,
) =>
	queryOptions({
		queryKey: ["package-settings", packageId] as const,
		queryFn: ({ queryKey }) =>
			execute(new Project.GetPackageSettings({ package: queryKey[1] })),
		reconcile: (o, n) => reconcile(n)(o),
	});
