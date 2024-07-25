import {
	Badge,
	Dialog,
	DialogContent,
	DialogTrigger,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@macrograph/ui";
import { createEventListener } from "@solid-primitives/event-listener";
import { clientOnly } from "@solidjs/start";

const Editor = clientOnly(() => import("../Editor"));

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

import { Button } from "@macrograph/ui";
import {
	action,
	cache,
	createAsync,
	useAction,
	useSearchParams,
} from "@solidjs/router";
import {
	ErrorBoundary,
	For,
	type ParentProps,
	Show,
	Suspense,
	createSignal,
	onMount,
} from "solid-js";
import { appendResponseHeader } from "vinxi/http";
import {
	type DownloadTarget,
	getDownloadURL,
	getLatestVersion,
} from "~/lib/releases";
import IconIcBaselineDiscord from "~icons/ic/baseline-discord.jsx";
import IconMdiGithub from "~icons/mdi/github.jsx";

const getDownloadURL_cached = cache((target: DownloadTarget) => {
	"use server";

	appendResponseHeader("CDN-Cache-Control", `public, max-age=${60 * 60 * 5}`);

	return getDownloadURL(target);
}, "getLatestVersion");

const getLatestVersion_cached = cache(() => {
	"use server";

	appendResponseHeader("CDN-Cache-Control", `public, max-age=${60 * 60 * 5}`);

	return getLatestVersion();
}, "getLatestVersion");

const MenuItems = clientOnly(() =>
	import("../Editor").then((i) => ({ default: i.ConnectionsDialogButton })),
);
const ProjectName = clientOnly(() =>
	import("../Editor").then((i) => ({ default: i.ProjectName })),
);
const ExportButton = clientOnly(() =>
	import("../Editor").then((i) => ({ default: i.ExportButton })),
);
const ShareButton = clientOnly(() =>
	import("../Editor").then((i) => ({ default: i.ShareButton })),
);

import { toast } from "solid-sonner";
import { getAuthState, getUser } from "~/api";
import IconTablerDeviceDesktopDown from "~icons/tabler/device-desktop-down";

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
				<DesktopDownloadButton />
				<Socials />
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

function DesktopDownloadButton() {
	const latestVersion = createAsync(() => getLatestVersion_cached());

	return (
		<DropdownMenu placement="bottom-end">
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
			<DropdownMenuContent>
				<Suspense
					fallback={
						<div class="px-2 py-1 font-medium">Loading Versions...</div>
					}
				>
					<ErrorBoundary fallback="">
						<div class="px-2 py-1 font-medium">Version {latestVersion()}</div>
					</ErrorBoundary>
					<For
						each={
							[
								["windows-x86_64", "Windows"],
								[
									"darwin-aarch64",
									["macOS", <Badge class="ml-2">Apple Silicon</Badge>],
								],
								["darwin-x86_64", ["macOS", <Badge class="ml-2">Intel</Badge>]],
								[
									"linux-x86_64-AppImage",
									["Linux", <Badge class="ml-2">AppImage</Badge>],
								],
								[
									"linux-x86_64-deb",
									["Linux", <Badge class="ml-2">deb</Badge>],
								],
							] satisfies Array<[DownloadTarget, JSX.Element]>
						}
					>
						{([target, name]) => (
							<DropdownMenuItem
								onSelect={() =>
									getDownloadURL_cached(target).then((url) => window.open(url))
								}
							>
								{name}
							</DropdownMenuItem>
						)}
					</For>
				</Suspense>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function Socials() {
	return (
		<>
			<a
				class="hover:text-[#7289da] p-1"
				target="_blank"
				href="https://discord.gg/FEyYaC8v53"
				rel="noreferrer"
			>
				<IconIcBaselineDiscord class="size-6" />
			</a>
			<a
				class="hover:text-[#4078c0] p-1"
				target="_blank"
				href="https://github.com/brendonovich/macrograph"
				rel="noreferrer"
			>
				<IconMdiGithub class="size-6" />
			</a>
		</>
	);
}

import { parse } from "cookie-es";

const isLoggedIn = () => parse(document.cookie)[IS_LOGGED_IN] === "true";

function AuthSection() {
	const user = createAsync(() => getUser());

	return (
		<Suspense
			fallback={
				<div class="size-7 bg-neutral-700 rounded-full animate-pulse mr-1" />
			}
		>
			<Show
				when={(() => {
					if (user()) return user();
					if (!isLoggedIn()) return false;
					return user();
				})()}
				fallback={<LoginButton />}
			>
				{(user) => (
					<UserDropdown user={user()}>
						<DropdownMenuTrigger class="size-7 bg-neutral-600 rounded-full mr-1 flex items-center justify-center">
							{user().email[0].toUpperCase()}
						</DropdownMenuTrigger>
					</UserDropdown>
				)}
			</Show>
		</Suspense>
	);
}

import type { JSX, ValidComponent } from "solid-js";
import IconRadixIconsExternalLink from "~icons/radix-icons/external-link";
import { LoginForm, SignUpForm } from "./(auth)/Forms";
import { IS_LOGGED_IN, logOutAction } from "./(auth)/utils";

function UserDropdown(
	props: ParentProps<{ user: ReturnType<typeof getUser> }>,
) {
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
					as={(props) => <a {...props} href="/credentials" target="external" />}
				>
					Credentials <IconRadixIconsExternalLink />
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					onSelect={() =>
						toast.promise(logOut(), {
							loading: "Logging out...",
							success: "Logged out successfully",
							error: "Failed to log out",
						})
					}
				>
					Log Out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function LoginButton() {
	const [mode, setMode] = createSignal<"login" | "signup">("login");

	const [open, setOpen] = createSignal(false);

	function onLogin() {
		setOpen(false);
		toast.success("You are now logged in!");
	}

	const [search, setSearch] = useSearchParams();

	onMount(() => {
		if (search.promptLogin) {
			if (!isLoggedIn()) setOpen(true);

			setSearch({ promptLogin: null }, { replace: true });
		}
	});

	return (
		<Dialog open={open()} onOpenChange={setOpen}>
			<DialogTrigger<typeof Button>
				as={(props) => <Button {...props} size="sm" />}
			>
				Login
			</DialogTrigger>
			<DialogContent class="p-8">
				<div
					onKeyDown={(e) => e.stopPropagation()}
					onKeyUp={(e) => e.stopPropagation()}
				>
					<Show
						keyed
						when={mode() === "login"}
						fallback={
							<div>
								<SignUpForm
									onLogin={() => setMode("login")}
									onSignup={onLogin}
								/>
							</div>
						}
					>
						<LoginForm onSignup={() => setMode("signup")} onLogin={onLogin} />
					</Show>
				</div>
			</DialogContent>
		</Dialog>
	);
}
