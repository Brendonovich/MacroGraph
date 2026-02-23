import type { Exit } from "effect";
import { PromiseButton } from "@macrograph/package-sdk/ui";
import type { Credential } from "@macrograph/project-domain";
import { queryOptions, type UseQueryResult } from "@tanstack/solid-query";
import { For } from "solid-js";

import { MatchEffectQuery } from "../MatchEffectQuery";
import { mutationOptions } from "../tanstack-query";

export const credentialsQueryOptions = <T,>(queryFn: () => Promise<T>) =>
	queryOptions({ queryKey: ["credentials"], queryFn });

export const refetchCredentialsMutationOptions = (
	mutationFn: () => Promise<any>,
) => mutationOptions({ mutationKey: ["refetchCredentials"], mutationFn });

export function CredentialsPage(props: {
	description: string;
	credentials: UseQueryResult<
		Exit.Exit<ReadonlyArray<Credential.Credential>, any>
	>;
	onRefetch?(): Promise<any>;
}) {
	return (
		<>
			<div class="flex flex-row justify-between mb-3">
				<div>
					<span class="text-xl font-bold">Credentials</span>
					<p class="text-gray-11 mt-1">{props.description}</p>
				</div>
				<PromiseButton
					disabled={props.credentials.isPending}
					onClick={() => props.onRefetch?.()}
				>
					Refetch
				</PromiseButton>
			</div>
			<MatchEffectQuery
				query={props.credentials}
				// onError={() => {
				// if (Cause.isFailType(e)) {
				// 	return "Register this server to your account to view credentials";
				// }
				// }}
				onSuccess={(credentials) => (
					<ul class="divide-gray-5 divide-y">
						<For each={credentials()}>
							{(credential) => (
								<li class="py-1 flex flex-row justify-between items-center">
									<div class="flex flex-col items-start">
										<span class="">
											{credential.displayName ?? credential.providerUserId}
										</span>
										<pre class="text-gray-11">{credential.providerUserId}</pre>
									</div>
									<span>{credential.providerId}</span>
								</li>
							)}
						</For>
					</ul>
				)}
			/>
		</>
	);
}
