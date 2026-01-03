import {
	Button,
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@macrograph/ui";
import "@macrograph/ui/global.css";
import { createAsync, useAction } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import { open as openURL } from "@tauri-apps/api/shell";
import {
	createSignal,
	ErrorBoundary,
	type ParentProps,
	Show,
	Suspense,
	type ValidComponent,
} from "solid-js";
import { toast } from "solid-sonner";

import { api, logOutAction, sessionToken, setSessionToken } from "../api";
import { core } from "../core";
import { env } from "../env";
import { rspc } from "../rspc";

export default function () {
	return (
		<div class="w-screen h-screen bg-neutral-900 text-white flex flex-col">
			<Header />
			<main class="flex-1 w-full bg-neutral-800 overflow-hidden">
				<Editor />
			</main>
		</div>
	);
}

function Header() {
	const user = api.getUser.createQuery(() => ["getUser"], {});

	return (
		<header class="w-full flex flex-row px-3 py-2 justify-left items-center h-12">
			<div class="flex-1 flex flex-row gap-1">
				<MenuItems />
			</div>
			<div>
				<span class="text-sm font-medium">{core.project.name}</span>
			</div>
			<div class="flex-1 flex flex-row justify-end">
				<Suspense
					fallback={
						<div class="w-8 h-8 bg-neutral-700 rounded-full animate-pulse" />
					}
				>
					<Show
						when={(() => {
							if (sessionToken() === null) return false;
							return user.data?.body;
						})()}
						fallback={<LogInDialog />}
					>
						{(user) => (
							<UserDropdown user={user()}>
								<DropdownMenuTrigger class="w-8 h-8 bg-neutral-600 rounded-full flex items-center justify-center">
									{user().email[0].toUpperCase()}
								</DropdownMenuTrigger>
							</UserDropdown>
						)}
					</Show>
				</Suspense>
			</div>
		</header>
	);
}

import IconRadixIconsExternalLink from "~icons/radix-icons/external-link";
import Editor, { MenuItems } from "../Editor";

function UserDropdown(props: ParentProps<{ user: { email: string } }>) {
	const logOut = useAction(logOutAction);

	return (
		<DropdownMenu>
			{props.children}
			<DropdownMenuContent>
				<div class="px-2 py-1">
					<span class="text-sm font-bold">{props.user.email}</span>
				</div>
				<DropdownMenuSeparator />
				<DropdownMenuItem<ValidComponent>
					class="gap-2"
					closeOnSelect={false}
					as={(props) => (
						<button
							{...props}
							class="w-full"
							onClick={() =>
								openURL(`${env.VITE_MACROGRAPH_API_URL}/credentials`)
							}
						/>
					)}
				>
					Credentials <IconRadixIconsExternalLink />
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onSelect={() =>
						logOut().then(() => toast.success("Logged out successfully"))
					}
				>
					Log Out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function LogInDialog(_props: ParentProps) {
	const [open, setOpen] = createSignal(false);
	const queryClient = useQueryClient();

	const sessionToken = createAsync(async () => {
		const sessionToken = await new Promise<string>((res, rej) => {
			if (!open()) return;

			rspc.createSubscription(() => ["loginListen"] as any, {
				onData: res,
				onError: rej,
			});
		});

		setSessionToken(sessionToken);
		setOpen(false);

		const promise = queryClient.invalidateQueries();

		toast.promise(promise, {
			loading: "Logging in...",
			success: "You are now logged in!",
			error: "Failed to log in.",
		});
		await promise;

		return sessionToken;
	});

	return (
		<Dialog open={open()} onOpenChange={setOpen}>
			<DialogTrigger as={Button}>Log In</DialogTrigger>
			<DialogContent class="p-6">
				<DialogTitle class="text-xl">Browser Log In</DialogTitle>
				<DialogDescription class="max-w-sm mt-1">
					Go to MacroGraph Web and login to share login details with MacroGraph
					Desktop.
					<br />
					<br />
					If MacroGraph Desktop isn't detected, make sure to use a browser other
					than Safari and disable its security hardening.
				</DialogDescription>

				<span class="my-8 text-neutral-200 text-center">
					<ErrorBoundary fallback="Failed to listen for authentication">
						<Suspense fallback="Waiting for authentication from MacroGraph Web">
							<Show when={sessionToken()}>Authentication received...</Show>
						</Suspense>
					</ErrorBoundary>
				</span>

				<Button
					onClick={() =>
						openURL(`${env.VITE_MACROGRAPH_API_URL}?promptLogin=true`)
					}
				>
					Open MacroGraph Web
				</Button>
			</DialogContent>
		</Dialog>
	);
}
