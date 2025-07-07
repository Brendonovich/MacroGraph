import type { SubscribableCache } from "@macrograph/domain";
import { useParams } from "@solidjs/router";
import { Effect, Fiber, Option, Stream } from "effect";
import {
	type Accessor,
	ErrorBoundary,
	Show,
	createEffect,
	createResource,
	onCleanup,
} from "solid-js";
import { Dynamic } from "solid-js/web";

import { useProjectRuntime, useProjectService } from "../AppRuntime";
import { PackagesSettings } from "../Packages/PackagesSettings";

export default function () {
	const params = useParams<{ package: string }>();

	const packagesSettings = useProjectService(PackagesSettings);

	return (
		<ErrorBoundary fallback="Package UI Error">
			<Show
				when={Option.getOrUndefined(
					packagesSettings.getPackage(params.package),
				)}
				keyed
			>
				{(settings) => {
					const state = useSubscribableCache(() => settings.state);

					return (
						<Show when={state()}>
							{(s) => (
								<Dynamic
									component={settings.SettingsUI}
									rpc={settings.rpcClient}
									state={s()}
									globalState={{
										auth: { state: "logged-in", userId: "" },
										logsPanelOpen: false,
									}}
								/>
							)}
						</Show>
					);
				}}
			</Show>
		</ErrorBoundary>
	);
}

export function useSubscribableCache<A, E>(
	cache: Accessor<SubscribableCache.SubscribableCache<A, E>>,
) {
	const projectRuntime = useProjectRuntime();

	const [state, actions] = createResource(cache, (cache) => {
		return cache.get.pipe(projectRuntime.runPromise);
	});

	createEffect(() => {
		const fiber = cache()
			.changes()
			.pipe(
				Stream.runForEach(() =>
					Effect.sync(() => {
						actions.refetch();
					}),
				),
				projectRuntime.runFork,
			);

		onCleanup(() => Fiber.interrupt(fiber).pipe(projectRuntime.runFork));
	});

	return state;
}
