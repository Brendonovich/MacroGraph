import { Cause, Effect } from "effect";
import { EffectButton } from "@macrograph/package-sdk/ui";
import { useQuery } from "@tanstack/solid-query";

import { useEffectRuntime, useEffectService } from "../../EffectRuntime";
import { MatchEffectQuery } from "../../effect-query/components";
import { ServerRpc } from "../../ServerRpc";

export default function Credentials() {
	const rpc = useEffectService(ServerRpc.client);
	const runtime = useEffectRuntime();

	const credentials = useQuery(() => ({
		queryKey: ["credentials"],
		queryFn: () => rpc.GetCredentials().pipe(runtime.runPromiseExit),
	}));

	return (
		<>
			<div class="flex flex-row justify-between mb-3">
				<div>
					<span class="text-xl font-bold">Credentials</span>
					<p class="text-gray-11 mt-1">
						The credentials connected to this server's MacroGraph account.
					</p>
				</div>
				<EffectButton
					disabled={!credentials.isSuccess}
					onClick={() =>
						rpc
							.RefetchCredentials()
							.pipe(Effect.tapErrorCause((v) => Effect.log(JSON.stringify(v))))
					}
				>
					Refetch
				</EffectButton>
			</div>
			<MatchEffectQuery
				query={credentials}
				onError={(e) => {
					if (Cause.isFailType(e)) {
						switch (e.error._tag) {
							case "NoRegistrationError":
								return "Register this server to your account to view credentials";
						}
					}

					return "An error occurred";
				}}
				onSuccess={(data) => (
					<ul class="divide-gray-5 divide-y">
						{data().map((credential) => (
							<li class="py-1 flex flex-row justify-between items-center">
								<div class="flex flex-col items-start">
									<span class="">
										{credential.displayName ?? credential.providerUserId}
									</span>
									<pre class="text-gray-11">{credential.providerUserId}</pre>
								</div>
								<span>{credential.providerId}</span>
							</li>
						))}
					</ul>
				)}
			/>
		</>
	);
}
