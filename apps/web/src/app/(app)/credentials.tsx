import { For, Show, Suspense } from "solid-js/web";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@macrograph/ui";
import { toast } from "solid-sonner";
import {
  createAsync,
  useAction,
  useSubmission,
  useSubmissions,
} from "@solidjs/router";

import {
  PROVIDER_DISPLAY_NAMES,
  addCredential,
  getCredentials,
  removeCredential,
} from "~/api";
import { AuthProvider } from "../auth/providers";

export default function () {
  return (
    <div class="space-y-4">
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
      <DropdownMenuTrigger as={Button}>Add Connection</DropdownMenuTrigger>
      <DropdownMenuContent>
        <For each={PROVIDER_LIST}>
          {(provider) => (
            <DropdownMenuItem
              onSelect={() =>
                doAddCredential(provider).then((cred) =>
                  toast.success(
                    <>
                      Credential <b>{cred.user.displayName}</b> added for{" "}
                      <b>{PROVIDER_DISPLAY_NAMES[provider]}</b>
                    </>
                  )
                )
              }
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

  return (
    <ul class="border border-neutral-800 rounded-lg divide-y divide-neutral-800">
      <For each={submissions.filter((s) => s.pending)}>
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
      <For
        each={credentials()}
        fallback={
          <p class="p-4 text-sm text-medium text-center">
            No connections found
          </p>
        }
      >
        {(connection) => {
          const removeSubmission = useSubmission(
            removeCredential,
            (s) =>
              s[0] === connection.providerId &&
              s[1] === connection.providerUserId
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
                  connection.providerUserId
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
