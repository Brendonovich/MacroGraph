import type { Effect, Request as ERequest } from "effect";
import type { Package, Request } from "@macrograph/project-domain";
import type { TabLayout } from "@macrograph/ui";
import { useQuery } from "@tanstack/solid-query";

import { useEffectRuntime } from "../EffectRuntime";
import type { PackageState } from "../State";
import type { PackageClient } from "./Clients";
import { PackageSettings, packageSettingsQueryOptions } from "./Settings";

type Schema<TType extends string> = {
	type: TType;
	tabId: number;
	package: PackageState;
	packageId: Package.Id;
	client: PackageClient;
};

export function makePackageTabSchema<TType extends string>(
	getSettings: (
		req: Request.GetPackageSettings,
	) => Effect.Effect<ERequest.Request.Success<Request.GetPackageSettings>, any>,
): TabLayout.Schema<Schema<TType>> {
	return {
		getMeta: (tab) => ({
			title: tab.package.name,
			desc: "Package",
		}),
		Component: (tab) => {
			const runtime = useEffectRuntime();

			const settingsQuery = useQuery(() =>
				packageSettingsQueryOptions(tab().package.id, (req) =>
					getSettings(req).pipe(runtime.runPromiseExit),
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
