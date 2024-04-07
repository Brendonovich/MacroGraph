import { clientOnly } from "@solidjs/start";
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

const Editor = clientOnly(() => import("../Editor"));

export default function Index() {
  return (
    <div class="w-screen h-screen bg-neutral-900 text-white flex flex-col">
      <ErrorBoundary fallback={<></>}>
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
    const id = await fetch("http://localhost:25000");

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
                      </>
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
      </>
    );

    return id;
  } catch (e) {
    // if (auth())
    //   toast.info(
    //     <>
    //       <b>MacroGraph Desktop</b> not detected. If this is unexpected,
    //       make sure your browser's security hardening is disabled.
    //     </>
    //   );

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

import IconIcBaselineDiscord from "~icons/ic/baseline-discord.jsx";
import IconMdiGithub from "~icons/mdi/github.jsx";
import { Button } from "@macrograph/ui";
import {
  ErrorBoundary,
  For,
  ParentProps,
  Show,
  Suspense,
  createSignal,
  onMount,
} from "solid-js";
import { As } from "@kobalte/core";
import { appendResponseHeader } from "vinxi/http";
import {
  action,
  cache,
  createAsync,
  useAction,
  useSearchParams,
} from "@solidjs/router";
import { DownloadTarget, getDownloadURL } from "~/lib/releases";

const getDownloadURL_cached = cache((target: DownloadTarget) => {
  "use server";

  appendResponseHeader("CDN-Cache-Control", `public, max-age=${60 * 60 * 24}`);

  return getDownloadURL(target);
}, "getLatestVersion");

const MenuItems = clientOnly(() =>
  import("../Editor").then((i) => ({ default: i.ConnectionsDialogButton }))
);
const ProjectName = clientOnly(() =>
  import("../Editor").then((i) => ({ default: i.ProjectName }))
);
const ExportButton = clientOnly(() =>
  import("../Editor").then((i) => ({ default: i.ExportButton }))
);

import IconTablerDeviceDesktopDown from "~icons/tabler/device-desktop-down";
import { getAuthState, getUser } from "~/api";
import { toast } from "solid-sonner";

function Header() {
  return (
    <header class="w-full flex flex-row p-2 justify-between items-center h-14">
      <div class="flex-1 flex flex-row gap-2 items-center">
        <Logo />
        <MenuItems />
      </div>
      <div class="flex flex-row items-center gap-2">
        <ProjectName />
      </div>
      <div class="flex-1 flex flex-row justify-end items-center gap-3">
        <div class="flex-1 pl-2">
          <ExportButton />
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
    <h1 class="text-3xl font-black mx-2">
      <a href="/">MacroGraph</a>
    </h1>
  );
}

function DesktopDownloadButton() {
  return (
    <DropdownMenu placement="bottom-end">
      <DropdownMenuTrigger asChild>
        <As
          component={Button}
          class="flex-row flex items-center"
          size="icon"
          variant="ghost"
          title="Download Desktop App"
        >
          <IconTablerDeviceDesktopDown class="w-6 h-6" />
        </As>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
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
              ["linux-x86_64-deb", ["Linux", <Badge class="ml-2">deb</Badge>]],
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Socials() {
  return (
    <>
      <a
        class="hover:text-[#7289da]"
        target="_blank"
        href="https://discord.gg/FEyYaC8v53"
      >
        <IconIcBaselineDiscord class="w-7 h-7" />
      </a>
      <a
        class="hover:text-[#4078c0]"
        target="_blank"
        href="https://github.com/brendonovich/macrograph"
      >
        <IconMdiGithub class="w-7 h-7" />
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
        <div class="w-8 h-8 bg-neutral-700 rounded-full mr-2 animate-pulse" />
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
            <DropdownMenuTrigger class="w-8 h-8 bg-neutral-600 rounded-full mr-2 flex items-center justify-center">
              {user().email[0].toUpperCase()}
            </DropdownMenuTrigger>
          </UserDropdown>
        )}
      </Show>
    </Suspense>
  );
}

import IconRadixIconsExternalLink from "~icons/radix-icons/external-link";
import { IS_LOGGED_IN, logOutAction } from "./(auth)/utils";
import { LoginForm, SignUpForm } from "./(auth)/Forms";
import { JSX } from "solid-js";

function UserDropdown(
  props: ParentProps<{ user: ReturnType<typeof getUser> }>
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
        <DropdownMenuItem asChild class="gap-2" closeOnSelect={false}>
          <As component="a" href="/credentials" target="external">
            Credentials <IconRadixIconsExternalLink />
          </As>
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
      <DialogTrigger asChild>
        <As component={Button} size="sm">
          Login
        </As>
      </DialogTrigger>
      <DialogContent class="p-8">
        <Show
          keyed
          when={mode() === "login"}
          fallback={
            <SignUpForm onLogin={() => setMode("login")} onSignup={onLogin} />
          }
        >
          <LoginForm onSignup={() => setMode("signup")} onLogin={onLogin} />
        </Show>
      </DialogContent>
    </Dialog>
  );
}
