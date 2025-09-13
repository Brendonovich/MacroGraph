import { Dialog } from "@kobalte/core";
import { Button, EffectButton } from "@macrograph/package-sdk/ui";
import { A } from "@solidjs/router";
import { Effect, Option } from "effect";
import { createSignal, type ValidComponent } from "solid-js";
import { useQuery, useQueryClient } from "@tanstack/solid-query";

import { useProjectService } from "./AppRuntime";
import { AuthActions } from "./Auth";
import { ClientListDropdown } from "./Presence/ClientListDropdown";
import { ProjectRpc } from "./Project/Rpc";

export function Header() {
	return (
		<div class="flex flex-row gap-2 px-2 items-center h-10 bg-gray-2 z-10">
			<A
				class="p-1 px-2 rounded hover:bg-gray-3"
				inactiveClass="bg-gray-2"
				activeClass="bg-gray-3"
				href="/packages"
			>
				Packages
			</A>
			<A
				class="p-1 px-2 rounded hover:bg-gray-3"
				inactiveClass="bg-gray-2"
				activeClass="bg-gray-3"
				href="/"
				end
			>
				Graphs
			</A>
			<div class="flex-1" />
			<A
				class="p-1 px-2 rounded hover:bg-gray-3"
				inactiveClass="bg-gray-2"
				activeClass="bg-gray-3"
				href="/settings"
			>
				Settings
			</A>
			<AuthSection />
		</div>
	);
}

function AuthSection() {
	const rpc = useProjectService(ProjectRpc.client);

	const user = useQuery(() => ({
		queryKey: ["user"],
		queryFn: () => rpc.GetUser().pipe(Effect.runPromise),
	}));

	return (
		<>
			<ClientListDropdown />
			{user.data && Option.isNone(user.data) && <ClientLoginButton />}
		</>
	);
}

function ClientLoginButton() {
	const queryClient = useQueryClient();
	const [open, setOpen] = createSignal(false);
	const authActions = useProjectService(AuthActions);

	return (
		<Dialog.Root open={open()} onOpenChange={setOpen}>
			<Dialog.Trigger<ValidComponent> as={(props) => <Button {...props} />}>
				Login
			</Dialog.Trigger>

			<Dialog.Portal>
				<Dialog.Overlay class="fixed inset-0 z-50 bg-black/20 animate-in fade-in" />
				<div class="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in zoom-in-95">
					<Dialog.Content class="z-50 bg-gray-1 p-4">
						<span>Login</span>
						<p>Use the button below to login via macrograph.app</p>
						<EffectButton
							onClick={() =>
								authActions.login.pipe(
									Effect.zipLeft(
										Effect.promise(() => {
											setOpen(false);
											return queryClient.invalidateQueries();
										}),
									),
								)
							}
						>
							Open Login Page
						</EffectButton>
					</Dialog.Content>
				</div>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
