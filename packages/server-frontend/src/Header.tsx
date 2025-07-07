import { A } from "@solidjs/router";
import { Dialog } from "@kobalte/core";
import { ClientListDropdown } from "./Presence/ClientListDropdown";
import type { ValidComponent } from "solid-js";
import { useProjectService } from "./AppRuntime";
import { ClientAuth } from "./Auth";
import { Button, EffectButton } from "@macrograph/package-sdk/ui";

export function Header() {
	return (
		<div class="flex flex-row gap-2 px-2 items-center h-10 bg-gray-2 z-10">
			<A
				class="p-1 px-2 rounded hover:bg-gray-3"
				inactiveClass="bg-gray-2"
				activeClass="bg-gray-3"
				href="/settings"
			>
				Settings
			</A>
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
				Graph
			</A>
			<div class="flex-1" />
			<ClientListDropdown />
			<ClientLoginButton />
		</div>
	);
}

function ClientLoginButton() {
	const clientAuth = useProjectService(ClientAuth);

	return (
		<>
			<Dialog.Root>
				<Dialog.Trigger<ValidComponent> as={(props) => <Button {...props} />}>
					Login
				</Dialog.Trigger>

				<Dialog.Portal>
					<Dialog.Overlay class="fixed inset-0 z-50 bg-black/20 animate-in fade-in" />
					<div class="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in zoom-in-95">
						<Dialog.Content class="z-50 bg-gray-1 p-4">
							<span>Login</span>
							<p>Use the button below to login via macrograph.app</p>
							<EffectButton onClick={() => clientAuth.login}>
								Open Login Page
							</EffectButton>
						</Dialog.Content>
					</div>
				</Dialog.Portal>
			</Dialog.Root>
		</>
	);
}
