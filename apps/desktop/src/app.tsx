import { ConnectionsDialog, CoreProvider } from "@macrograph/interface";
import { FileRoutes } from "@solidjs/start/router";
import { Router, action, createAsync, useAction } from "@solidjs/router";
import { ErrorBoundary, ParentProps, Show, Suspense } from "solid-js";
import {
  As,
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
import { Toaster, toast } from "solid-sonner";

import { core } from "./core";

import "./app.css";
import { env } from "./env";
import { open as openURL } from "@tauri-apps/api/shell";
import { createSignal } from "solid-js";
import { rspc, client, queryClient } from "./rspc";
import { useQueryClient } from "@tanstack/solid-query";
import { api, logOutAction, sessionToken, setSessionToken } from "./api";
import Editor from "./Editor";

function Root() {
  const user = api.getUser.createQuery(() => ["getUser"], {});

  return (
    <>
      <Toaster />
      <div class="w-screen h-screen bg-neutral-900 text-white flex flex-col">
        <header class="w-full flex flex-row px-4 py-2 justify-left items-center h-14">
          <div class="flex-1">
            <CoreProvider core={core} rootRef={() => null!}>
              <ConnectionsDialog />
            </CoreProvider>
          </div>
          <div>
            <span>{core.project.name}</span>
          </div>
          <div class="flex-1 flex flex-row justify-end">
            <Suspense
              fallback={
                <div class="w-8 h-8 bg-neutral-700 rounded-full mr-2 animate-pulse" />
              }
            >
              <Show
                when={(() => {
                  const u = user.data;
                  if (sessionToken() === null) return false;
                  return u?.body;
                })()}
                fallback={
                  <LogInDialog>
                    <As component={Button}>Log In</As>
                  </LogInDialog>
                }
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
          </div>
        </header>
        <main class="flex-1 w-full bg-neutral-800 overflow-hidden">
          <Editor />
        </main>
      </div>
    </>
  );
}

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
        <DropdownMenuItem asChild class="gap-2" closeOnSelect={false}>
          <As
            component="button"
            class="w-full"
            onClick={() =>
              openURL(`${env.VITE_MACROGRAPH_API_URL}/credentials`)
            }
          >
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

function LogInDialog(props: ParentProps) {
  const [open, setOpen] = createSignal(false);
  const queryClient = useQueryClient();

  const sessionToken = createAsync(async () => {
    const sessionToken = await new Promise<string>((res, rej) => {
      if (!open()) return;
      console.log({ open });

      rspc.createSubscription(() => ["loginListen"] as any, {
        onData: res,
        onError: rej,
      });
    });

    setSessionToken(sessionToken);
    queryClient.invalidateQueries();
    setOpen(false);
    toast.success("Logged in successfully!");

    return sessionToken;
  });

  return (
    <Dialog open={open()} onOpenChange={setOpen}>
      <DialogTrigger asChild>{props.children}</DialogTrigger>
      <DialogContent class="p-6">
        <DialogTitle class="text-xl">Browser Log In</DialogTitle>
        <DialogDescription class="max-w-sm mt-1">
          Go to MacroGraph Web and login to share login details with MacroGraph
          Desktop.
          <br />
          <br />
          Make sure to disable your browser's security hardening if MacroGraph
          Desktop isn't detected.
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

export default function App() {
  return (
    <Router
      root={() => (
        <rspc.Provider client={client} queryClient={queryClient}>
          <Root />
        </rspc.Provider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
