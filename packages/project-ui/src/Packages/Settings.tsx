import { Effect, type Request as ERequest, Stream } from "effect";
import { createScopedEffect, LoadingBlock } from "@macrograph/package-sdk/ui";
import { type Package, Request } from "@macrograph/project-domain";
import {
	keepPreviousData,
	queryOptions,
	type UseQueryResult,
} from "@tanstack/solid-query";
import { Suspense } from "solid-js";
import { reconcile } from "solid-js/store";
import { Dynamic } from "solid-js/web";

import { MatchEffectQuery } from "../MatchEffectQuery";
import type { PackageClient } from "./Clients";

export function PackageSettings(props: {
	packageClient: PackageClient;
	settingsQuery: UseQueryResult<
		ERequest.Request.Success<Request.GetPackageEngineState>
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
				<MatchEffectQuery
					query={props.settingsQuery}
					onSuccess={(data) => (
						<Dynamic
							component={props.packageClient.SettingsUI}
							rpc={props.packageClient.rpcClient}
							state={data()}
						/>
					)}
				/>
			</Suspense>
		</div>
	);
}

export const packageSettingsQueryOptions = (
	packageId: Package.Id,
	execute: (
		r: Request.GetPackageEngineState,
	) => Promise<ERequest.Request.Success<Request.GetPackageEngineState>>,
) =>
	queryOptions({
		queryKey: ["package-settings", packageId] as const,
		queryFn: ({ queryKey }) =>
			execute(new Request.GetPackageEngineState({ package: queryKey[1] })),
		reconcile: (o, n) => reconcile(n)(o),
		placeholderData: keepPreviousData,
	});
