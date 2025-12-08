import { Effect, Option } from "effect";
import { EffectButton } from "@macrograph/package-sdk/ui";
import { ProjectActions } from "@macrograph/project-ui";
import { Show } from "solid-js";

import { useEffectQuery, useEffectService } from "../../EffectRuntime";
import { MatchEffectQuery } from "../../effect-query/components";
import { ProjectRpc } from "../../Project/Rpc";

export default function Account() {
	const rpc = useEffectService(ProjectRpc.client);
	const actions = useEffectService(ProjectActions);

	const registration = useEffectQuery(() => ({
		queryKey: ["server-registration"],
		queryFn: () => rpc.GetServerRegistration(),
	}));

	return (
		<>
			<span class="text-xl font-bold mb-1">Registration</span>
			<p class="text-gray-11 mb-3">
				The MacroGraph account this server is registered to.
			</p>
			<MatchEffectQuery
				query={registration}
				onError={(_) => <div>Unknown Error</div>}
				onSuccess={(data) => (
					<Show
						when={Option.getOrUndefined(data())}
						fallback={
							<EffectButton
								onClick={() =>
									actions.StartServerRegistration.pipe(
										Effect.zipRight(
											Effect.promise(() => registration.refetch()),
										),
									)
								}
							>
								Login
							</EffectButton>
						}
					>
						{(auth) => (
							<div class="flex flex-row items-center w-full bg-gray-1 rounded-l">
								<span class="px-2 flex-1">{auth().ownerId}</span>
								<EffectButton
									onClick={() =>
										rpc
											.RemoveServerRegistration()
											.pipe(
												Effect.zipRight(
													Effect.promise(() => registration.refetch()),
												),
											)
									}
								>
									Logout
								</EffectButton>
							</div>
						)}
					</Show>
				)}
			/>
		</>
	);
}
