import { createEventListener } from "@solid-primitives/event-listener";
import { clientOnly } from "@solidjs/start";

const Editor = clientOnly(() => import("./Editor"));

export default function () {
	return (
		<div class="w-screen h-screen bg-neutral-900 text-white flex flex-col">
			<ErrorBoundary fallback={null}>
				<DesktopListener />
			</ErrorBoundary>
			<Header />
			<main class="flex-1 w-full bg-neutral-800 overflow-hidden">
				<Editor />
			</main>
		</div>
	);
}

const doDesktopAuth = action(async () => {
	try {
		const id = await fetch("http://localhost:25000").catch(() => {});
		if (!id) return;

		const auth = await getAuthState();

		const toastId = toast.info(
			<>
				<b>MacroGraph Desktop</b> detected.
				<br />
				<Show when={auth} fallback={undefined /* TODO!!! */}>
					{(auth) => (
						<>
							Login as <b>{auth().user.email}</b>?
							<div class="flex flex-row gap-2 mt-2">
								<Button
									variant="secondary"
									onClick={async () => {
										await fetch("http://localhost:25000/session", {
											method: "POST",
											headers: {
												"Content-Type": "application/json",
											},
											body: JSON.stringify(auth().session.id),
										});

										toast.success(
											<>
												Login successful, head to <b>MacroGraph Desktop</b>
											</>,
										);
									}}
								>
									Login
								</Button>
								<Button
									variant="default"
									onClick={() => toast.dismiss(toastId)}
								>
									Cancel
								</Button>
							</div>
						</>
					)}
				</Show>
			</>,
		);

		return id;
	} catch (e) {
		return undefined;
	}
});

function DesktopListener() {
	const desktopAuth = useAction(doDesktopAuth);

	desktopAuth();

	createEventListener(window, "focus", () => {
		desktopAuth();
	});

	return null;
}

import { Button, DropdownMenuTrigger } from "@macrograph/ui";
import { action, useAction } from "@solidjs/router";
import { ErrorBoundary, Show, type ValidComponent } from "solid-js";

const MenuItems = clientOnly(() =>
	import("./Editor").then((i) => ({ default: i.ConnectionsDialogButton })),
);
const ProjectName = clientOnly(() =>
	import("./Editor").then((i) => ({ default: i.ProjectName })),
);
const ExportButton = clientOnly(() =>
	import("./Editor").then((i) => ({ default: i.ExportButton })),
);
const ShareButton = clientOnly(() =>
	import("./Editor").then((i) => ({ default: i.ShareButton })),
);

import { toast } from "solid-sonner";
import { getAuthState } from "~/api";
import { DesktopDownloadDropdown } from "./DesktopDownloadDropdown";

const AuthSection = clientOnly(() =>
	import("./Editor").then((i) => ({ default: i.AuthSection })),
);

function Header() {
	return (
		<header class="w-full flex flex-row p-2 justify-between items-center h-12">
			<div class="flex-1 flex flex-row gap-2 items-center">
				<Logo />
				<MenuItems />
			</div>
			<div class="text-sm font-medium">
				<ProjectName />
			</div>
			<div class="flex-1 flex flex-row justify-end items-center gap-1">
				<div class="flex-1 pl-2">
					<ExportButton />
					<ShareButton />
				</div>
				<DesktopDownloadDropdown>
					<DropdownMenuTrigger<ValidComponent>
						as={(props) => (
							<button
								{...props}
								class="flex-row flex items-center"
								size="icon"
								variant="ghost"
								title="Download Desktop App"
							/>
						)}
					>
						<IconTablerDeviceDesktopDown class="size-5" />
					</DropdownMenuTrigger>
				</DesktopDownloadDropdown>
				<AuthSection />
			</div>
		</header>
	);
}

function Logo() {
	return (
		<h1 class="text-2xl font-black mx-1">
			<a href="/">MacroGraph</a>
		</h1>
	);
}
