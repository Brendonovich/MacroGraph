import { For, createEffect, createSignal } from "solid-js";
import {
	getUserList,
	getFollowUserId,
	setFollowUserId,
} from "../../remoteHistorySync";
import { SidebarSection } from "../../components/Sidebar";

export function Viewers() {
	const [users, setUsers] = createSignal(getUserList());
	const [followId, setFollowId] = createSignal(getFollowUserId());

	createEffect(() => {
		const u = getUserList();
		const f = getFollowUserId();
		setUsers(u);
		setFollowId(f);
	});

	const isFollowing = (id: string) => followId() === id;

	return (
		<SidebarSection title="Viewers" class="overflow-y-hidden flex flex-col">
			<div class="flex-1 overflow-y-auto p-1">
				<ul class="flex flex-col space-y-0.5">
					<For each={users()}>
						{([id, name]) => (
							<li>
								<button
									type="button"
									class={`w-full flex flex-row items-center gap-2 px-2 py-1 rounded text-sm text-left transition-colors ${
										isFollowing(id)
											? "bg-blue-600 text-white"
											: "hover:bg-white/10 text-neutral-200"
									}`}
									onClick={() => {
										if (isFollowing(id)) setFollowUserId(null);
										else setFollowUserId(id);
									}}
								>
									<div
										class={`size-2 rounded-full ${
											id === "host" ? "bg-green-500" : "bg-blue-400"
										}`}
									/>
									<span>{name}</span>
									{isFollowing(id) && (
										<span class="ml-auto text-xs text-blue-200">Following</span>
									)}
								</button>
							</li>
						)}
					</For>
				</ul>
			</div>
		</SidebarSection>
	);
}
