import { EffectButton } from "@macrograph/package-sdk/ui";
import { Show } from "solid-js";
import { Cause, Effect, Either, Option } from "effect";

import { useEffectQuery, useProjectService } from "../../AppRuntime";
import { ProjectActions } from "../../Project/Actions";
import { ProjectRpc } from "../../Project/Rpc";
import { MatchEffectQuery } from "../../effect-query/components";

export default function Account() {
	const rpc = useProjectService(ProjectRpc.client);
	const actions = useProjectService(ProjectActions);

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
				onError={(v) =>
					Cause.isFailType(v) && v.error._tag === "PolicyDenied" ? (
						<div>Not permitted</div>
					) : (
						<div>Unknown Error</div>
					)
				}
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
