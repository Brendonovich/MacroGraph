import { For, Show, Suspense } from "solid-js/web";
import { createAsync, useAction, useSubmission } from "@solidjs/router";

import {
  addCredentialAction,
  getCredentials,
  removeCredentialAction,
} from "~/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";

export default function () {
  return (
    <div class="space-y-4">
      <header class="flex flex-row justify-between items-start text-white">
        <div class="space-y-1.5">
          <h1 class="text-3xl font-medium">Credentials</h1>
          <p class="text-sm text-neutral-400">
            Connect with other services to use them inside MacroGraph.
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

function AddCredentialButton() {
  const addCredentialSubmission = useSubmission(addCredentialAction);
  const addCredential = useAction(addCredentialAction);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        as={Button}
        disabled={addCredentialSubmission.pending}
      >
        <Show when={addCredentialSubmission.pending} fallback="Add Connection">
          Connecting to {addCredentialSubmission.input[0]}
        </Show>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {[
          ["twitch", "Twitch"],
          ["discord", "Discord"],
          ["spotify", "Spotify"],
          ["patreon", "Patreon"],
          ["github", "GitHub"],
        ].map(([id, display]) => (
          <DropdownMenuItem onSelect={() => addCredential(id)}>
            {display}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CredentialsList() {
  const credentials = createAsync(getCredentials);

  return (
    <ul class="border border-neutral-800 rounded-lg divide-y divide-neutral-800">
      <Show
        when={credentials()?.length !== 0}
        fallback={
          <p class="p-4 text-sm text-medium text-center">
            No connections found
          </p>
        }
      >
        <For each={credentials()}>
          {(connection) => {
            const removeSubmission = useSubmission(
              removeCredentialAction,
              (s) =>
                s[0] === connection.providerId &&
                s[1] === connection.providerUserId
            );

            return (
              <li class="p-4 flex flex-row items-center space-x-4 text-base">
                <div>
                  <h3 class="font-medium">{connection.displayName}</h3>
                  <span class=" text-sm text-neutral-400">
                    {connection.providerId}
                  </span>
                </div>
                <div class="flex-1" />
                <form
                  method="post"
                  action={removeCredentialAction.with(
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
      </Show>
    </ul>
  );
}
