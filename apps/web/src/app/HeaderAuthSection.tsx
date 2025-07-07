import {
	Button,
	Dialog,
	DialogContent,
	DialogTrigger,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@macrograph/ui";
import { createAsync, useAction, useSearchParams } from "@solidjs/router";
import { parse } from "cookie-es";
import {
	type ParentProps,
	Show,
	Suspense,
	type ValidComponent,
	createEffect,
	createSignal,
	on,
	onMount,
} from "solid-js";
import { toast } from "solid-sonner";
import posthog from "posthog-js";

import { getUser } from "~/api";
import { LoginForm, SignUpForm } from "./(auth)/Forms";
import { IS_LOGGED_IN, logOutAction } from "./(auth)/utils";

const isLoggedIn = () => parse(document.cookie)[IS_LOGGED_IN] === "true";

export function HeaderAuthFallback() {
	return <div class="size-7 bg-neutral-700 rounded-full animate-pulse mr-1" />;
}

export function HeaderAuthSection() {
	const user = createAsync(() => getUser());

	createEffect(
		on(
			() => user(),
			(user) => {
				if (user)
					posthog.identify(user.id, {
						email: user.email,
					});
				else posthog.reset();
			},
		),
	);

	return (
		<Suspense fallback={<HeaderAuthFallback />}>
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

export function UserDropdown(
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
					onSelect={() => {
						toast.promise(logOut(), {
							loading: "Logging out...",
							success: "Logged out successfully",
							error: "Failed to log out",
						});
					}}
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

	function onLogin(userId: string) {
		setOpen(false);
		toast.success("You are now logged in!");
		posthog.identify(userId);
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
