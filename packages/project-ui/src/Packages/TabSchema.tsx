import type { Effect, Request as ERequest } from "effect";
import type { Request } from "@macrograph/project-domain/updated";
import { useQuery } from "@tanstack/solid-query";

import { useEffectRuntime } from "../EffectRuntime";
import type { PackageState } from "../State";
import type { TabLayout } from "../TabLayout";
import type { PackageClient } from "./Clients";
import { PackageSettings, packageSettingsQueryOptions } from "./Settings";

export function makePackageTabSchema<
	TSchema extends {
		type: string;
		tabId: number;
		package: PackageState;
		client: PackageClient;
	},
>(
	getSettings: (
		req: Request.GetPackageSettings,
	) => Effect.Effect<ERequest.Request.Success<Request.GetPackageSettings>, any>,
): TabLayout.Schema<TSchema> {
	return {
		getMeta: (tab) => ({
			title: tab.package.name,
			desc: "Package",
		}),
		Component: (tab) => {
			const runtime = useEffectRuntime();

			const settingsQuery = useQuery(() =>
				packageSettingsQueryOptions(tab().package.id, (req) =>
					getSettings(req).pipe(runtime.runPromise),
				),
			);

			return (
				<PackageSettings
					packageClient={tab().client}
					settingsQuery={settingsQuery}
				/>
			);
		},
	};
}
