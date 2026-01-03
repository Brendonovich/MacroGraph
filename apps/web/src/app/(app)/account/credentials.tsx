import {
	Button,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@macrograph/ui";
import {
	createAsync,
	useAction,
	useSubmission,
	useSubmissions,
} from "@solidjs/router";
import { For, Show, Suspense } from "solid-js/web";
import { toast } from "solid-sonner";

import {
	addCredential,
	getCredentials,
	PROVIDER_DISPLAY_NAMES,
	removeCredential,
	WINDOW_OPEN_FAILED,
} from "~/api";
import type { AuthProvider } from "../../auth/providers";

export default function () {
	return (
		<div class="h-full w-full max-w-3xl p-4 space-y-4">
			<header class="flex flex-row justify-between items-start text-white">
				<div class="space-y-1.5">
					<h1 class="text-3xl font-medium">Credentials</h1>
					<p class="text-sm text-neutral-400">
						Add credentials to your account to use them within MacroGraph.
					</p>
				</div>
				<AddCredentialButton />
			</header>
			<Suspense>
				<CredentialsList />
			</Suspense>
		</div>
	);
}

const PROVIDER_LIST: Array<AuthProvider> = [
	"twitch",
	"discord",
	// "spotify",
	// "patreon",
	// "github",
];

function AddCredentialButton() {
	const doAddCredential = useAction(addCredential);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger as={Button}>Add Credential</DropdownMenuTrigger>
			<DropdownMenuContent>
				<For each={PROVIDER_LIST}>
					{(provider) => (
						<DropdownMenuItem
							onClick={() => {
								doAddCredential(provider)
									.then((cred) => {
										toast.success(
											<>
												Credential <b>{cred.user.displayName}</b> added for{" "}
												<b>{PROVIDER_DISPLAY_NAMES[provider]}</b>
											</>,
										);
									})
									.catch((e) => {
										if (
											e instanceof Error &&
											e.message === WINDOW_OPEN_FAILED
										) {
											toast.error(
												"Failed to open login window. Make sure your browser isn't blocking popups.",
											);
										}
									});
							}}
						>
							{PROVIDER_DISPLAY_NAMES[provider]}
						</DropdownMenuItem>
					)}
				</For>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function CredentialsList() {
	const credentials = createAsync(() => getCredentials());
	const submissions = useSubmissions(addCredential);

	const pendingsubmissions = () => [...submissions].filter((s) => s.pending);

	return (
		<ul class="border border-neutral-800 rounded-lg divide-y divide-neutral-800">
			<Show
				when={credentials()?.length === 0 && pendingsubmissions().length === 0}
			>
				<p class="p-4 text-sm text-medium text-center">No connections found</p>
			</Show>
			<For each={pendingsubmissions()}>
				{(submission) => (
					<li class="p-4 flex flex-row items-center space-x-4 text-base">
						<div>
							<h3 class="font-medium">Connecting...</h3>
							<span class=" text-sm text-neutral-400">
								{PROVIDER_DISPLAY_NAMES[submission.input[0]]}
							</span>
						</div>
						<div class="flex-1" />
						<Button size="sm" onClick={() => submission.clear()}>
							Cancel
						</Button>
					</li>
				)}
			</For>
			<For each={credentials()}>
				{(connection) => {
					const removeSubmission = useSubmission(
						removeCredential,
						(s) =>
							s[0] === connection.providerId &&
							s[1] === connection.providerUserId,
					);

					return (
						<li class="p-4 flex flex-row items-center space-x-4 text-base">
							<div>
								<h3 class="font-medium">{connection.displayName}</h3>
								<span class=" text-sm text-neutral-400">
									{PROVIDER_DISPLAY_NAMES[connection.providerId]}
								</span>
							</div>
							<div class="flex-1" />
							<form
								method="post"
								action={removeCredential.with(
									connection.providerId,
									connection.providerUserId,
								)}
							>
								<Button
									variant="destructive"
									type="submit"
									size="sm"
									disabled={removeSubmission.pending}
								>
									<Show when={removeSubmission.pending} fallback="Remove">
										Removing...
									</Show>
								</Button>
							</form>
						</li>
					);
				}}
			</For>
		</ul>
	);
}
