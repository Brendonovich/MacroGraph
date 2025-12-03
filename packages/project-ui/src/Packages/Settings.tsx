import { Effect, type Request as ERequest, Stream } from "effect";
import { createScopedEffect, LoadingBlock } from "@macrograph/package-sdk/ui";
import { type Package, Request } from "@macrograph/project-domain/updated";
import { queryOptions, type UseQueryResult } from "@tanstack/solid-query";
import { Suspense } from "solid-js";
import { reconcile } from "solid-js/store";
import { Dynamic } from "solid-js/web";

import type { PackageClient } from "./Clients";

export function PackageSettings(props: {
	packageClient: PackageClient;
	settingsQuery: UseQueryResult<
		ERequest.Request.Success<Request.GetPackageSettings>
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
	packageId: Package.Id,
	execute: (
		r: Request.GetPackageSettings,
	) => Promise<ERequest.Request.Success<Request.GetPackageSettings>>,
) =>
	queryOptions({
		queryKey: ["package-settings", packageId] as const,
		queryFn: ({ queryKey }) =>
			execute(new Request.GetPackageSettings({ package: queryKey[1] })),
		reconcile: (o, n) => reconcile(n)(o),
	});
