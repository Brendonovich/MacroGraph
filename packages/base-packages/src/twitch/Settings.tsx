import {
	EffectButton,
	LoadingBlock,
	type SettingsProps,
	useEffectRuntime,
} from "@macrograph/package-sdk/ui";
import { cx } from "cva";
import { createSignal, For, Index, Show, Suspense } from "solid-js";

import {
	SUBSCRIPTION_CATEGORY_OPTIONS,
	SUBSCRIPTION_TYPES,
	type SubscriptionCategory,
} from "./eventSub";
import { ClientRpcs, type ClientState } from "./new-shared";

const EVENTSUB_CONNECTION_INDICATOR = {
	connected: { class: "bg-green-600", label: "EventSub Connected" },
	disconnected: { class: "bg-red-600", label: "EventSub Disconnected" },
	connecting: { class: "bg-yellow-600", label: "EventSub Connecting" },
};

interface CategoryOption {
	value: SubscriptionCategory | "All";
	label: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
	{ value: "All", label: "All Categories" },
	...SUBSCRIPTION_CATEGORY_OPTIONS,
];

export default function Settings(
	props: SettingsProps<typeof ClientRpcs, typeof ClientState>,
) {
	const runtime = useEffectRuntime();

	const formatSubscriptionName = (type: string) => {
		return type
			.replace(/^channel\./, "")
			.replace(/\./g, " ")
			.replace(/_/g, " ")
			.split(" ")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	};

	return (
		<div class="w-full -mt-1 space-y-4">
			<Suspense fallback={<LoadingBlock />}>
				<ul class="rounded divide-y divide-gray-6 w-full mt-2">
					<Index
						each={props.state?.accounts ?? []}
						fallback={
							<div class="text-center p-2 text-gray-11 w-full italic">
								No Twitch accounts found
							</div>
						}
					>
						{(acc) => {
							const [expanded, setExpanded] = createSignal(false);
							const isExpanded = () => expanded();
							const enabledSubs = () => acc().enabledSubscriptions ?? [];

							return (
								<li class="flex flex-col w-full py-2 first:pt-0 last:pb-0">
									<div class="flex flex-row w-full items-center relative">
										<button
											class="absolute inset-0"
											onClick={() => setExpanded((e) => !e)}
										/>

										<div class="flex-1 flex flex-col gap-0.5">
											<div class="flex flex-row items-center">
												<IconTablerChevronRight
													class="size-4 -ml-1 mr-1 transition-transform"
													classList={{ "rotate-90": isExpanded() }}
												/>
												<span class="font-medium">{acc().displayName}</span>
											</div>
											<div class="flex flex-row items-center gap-2">
												<div
													class={cx(
														"size-2 rounded-full",
														EVENTSUB_CONNECTION_INDICATOR[
															acc().eventSubSocket.state
														].class,
													)}
												/>
												<span class="text-xs text-gray-11 italic">
													{
														EVENTSUB_CONNECTION_INDICATOR[
															acc().eventSubSocket.state
														].label
													}
												</span>
											</div>
										</div>

										<div class="flex items-center gap-2">
											<EffectButton
												variant="text"
												onClick={() =>
													acc().eventSubSocket.state === "connected"
														? props.rpc.DisconnectEventSub({
																accountId: acc().id,
															})
														: props.rpc.ConnectEventSub({ accountId: acc().id })
												}
											>
												<span>
													{acc().eventSubSocket.state === "connected"
														? "Disconnect"
														: "Connect"}
												</span>
											</EffectButton>
										</div>
									</div>

									<Show when={isExpanded()}>
										<div class="mt-2">
											<span class="text-gray-11 font-medium text-xs mb-0.5">
												EventSub Subscriptions
											</span>

											<div class="grid grid-cols-1 gap-1 max-h-[300px] overflow-y-auto mt-0.5">
												<For each={SUBSCRIPTION_TYPES}>
													{(subType) => {
														const isEnabled = () =>
															enabledSubs().includes(subType);

														return (
															<label class="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-4/50 rounded cursor-pointer group">
																<div class="flex flex-col">
																	<span class="text-sm">
																		{formatSubscriptionName(subType)}
																	</span>
																	<a
																		class="text-xs text-gray-11 hover:underline"
																		target="_blank"
																		href={`https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#${subType.replaceAll(".", "")}`}
																	>
																		{subType}
																	</a>
																</div>
																<div class="flex-1 h-full" />
																<input
																	type="checkbox"
																	checked={isEnabled()}
																	onChange={(e) =>
																		props.rpc
																			.ToggleEventSubSubscription({
																				accountId: acc().id,
																				subscriptionType: subType,
																				enabled: e.currentTarget.checked,
																			})
																			.pipe(runtime.runPromise)
																	}
																	class="size-4 rounded border border-gray-6 bg-gray-3 checked:bg-blue-600 checked:border-blue-600 cursor-pointer"
																/>
															</label>
														);
													}}
												</For>
											</div>
										</div>
									</Show>
								</li>
							);
						}}
					</Index>
				</ul>
			</Suspense>
		</div>
	);
}

export const Rpcs = ClientRpcs;
