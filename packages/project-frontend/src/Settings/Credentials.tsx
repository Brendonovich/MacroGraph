import { PromiseButton } from "@macrograph/package-sdk/ui";
import type { UseQueryResult } from "@tanstack/solid-query";
import type { Credential } from "@macrograph/project-domain";
import { For, Suspense } from "solid-js";

export function CredentialsPage(props: {
  description: string;
  credentials: UseQueryResult<readonly Credential.Credential[]>;
  onRefetch?(): Promise<any>;
}) {
  return (
    <>
      <div class="flex flex-row justify-between mb-3">
        <div>
          <span class="text-xl font-bold">Credentials</span>
          <p class="text-gray-11 mt-1">{props.description}</p>
        </div>
        <PromiseButton
          disabled={props.credentials.isPending}
          onClick={() => props.onRefetch?.()}
        >
          Refetch
        </PromiseButton>
      </div>
      <Suspense
        fallback={
          <div class="w-full p-4 flex items-center justify-center">
            <IconGgSpinner class="size-5 text-inherit animate-spin" />
          </div>
        }
      >
        <ul class="divide-gray-5 divide-y">
          <For each={props.credentials.data}>
            {(credential) => (
              <li class="py-1 flex flex-row justify-between items-center">
                <div class="flex flex-col items-start">
                  <span class="">
                    {credential.displayName ?? credential.providerUserId}
                  </span>
                  <pre class="text-gray-11">{credential.providerUserId}</pre>
                </div>
                <span>{credential.providerId}</span>
              </li>
            )}
          </For>
        </ul>
      </Suspense>
    </>
  );
}
