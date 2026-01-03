import { cache, createAsync, useSubmissions } from "@solidjs/router";
import { eq } from "drizzle-orm";
import { Show, Suspense } from "solid-js/web";

import { addCredential, ensureAuthedOrRedirect } from "~/api";
import { db } from "~/drizzle";
import { oauthApps } from "~/drizzle/schema";

export default function () {
	return (
		<div class="h-full w-full max-w-3xl p-4 space-y-4">
			<header class="flex flex-row justify-between items-start text-white">
				<div class="space-y-1.5">
					<h1 class="text-3xl font-medium">Servers</h1>
					<p class="text-sm text-neutral-400">
						Add MacroGraph servers to your account to administrate them.
					</p>
				</div>
				{/*<AddServerButton />*/}
			</header>
			<Suspense>
				<ServersList />
			</Suspense>
		</div>
	);
}

// const PROVIDER_LIST: Array<AuthProvider> = [
// 	"twitch",
// 	"discord",
// 	// "spotify",
// 	// "patreon",
// 	// "github",
// ];

// const addServer = action(async (userCode: string) => {
// 	"use server";

// 	const { user } = await ensureAuthedOrThrow();

// 	const session = await db().query.serverRegistrationSessions.findFirst({
// 		where: eq(serverRegistrationSessions.userCode, userCode),
// 	});

// 	if (!session) return false;

// 	await db
// 		.update(serverRegistrationSessions)
// 		.set({ userId: user.id })
// 		.where(eq(serverRegistrationSessions.userCode, userCode));

// 	return true;
// });

// function AddServerButton() {
// 	const doAddServer = useAction(addServer);
// 	const submission = useSubmission(addServer);

// 	const [open, setOpen] = createSignal(false);

// 	getServers();

// 	return (
// 		<Dialog open={open()} onOpenChange={setOpen}>
// 			<DialogTrigger as={Button}>Add Server</DialogTrigger>
// 			<DialogContent class="p-6">
// 				<DialogTitle class="text-xl">Add Server</DialogTitle>
// 				<DialogDescription class="mt-1">
// 					Enter the registration code logged by your server
// 				</DialogDescription>
// 				<Show when>
// 					{(_) => {
// 						const [code, setCode] = createSignal("");

// 						return (
// 							<>
// 								<input
// 									disabled={submission.pending}
// 									type="text"
// 									class="w-full h-12 my-4 text-3xl font-bold text-center bg-transparent rounded border-neutral-700"
// 									value={code()}
// 									onInput={(e) => {
// 										const value = e.currentTarget.value;
// 										if (value.length > 9) return;
// 										setCode(e.currentTarget.value);
// 									}}
// 								/>
// 								<Button
// 									disabled={submission.pending}
// 									type="submit"
// 									class="ml-auto"
// 									onClick={() => doAddServer(code()).then(() => setOpen(false))}
// 								>
// 									Submit
// 								</Button>
// 							</>
// 						);
// 					}}
// 				</Show>
// 			</DialogContent>
// 		</Dialog>
// 		// <DropdownMenu>
// 		//   <DropdownMenuTrigger as={Button}>Add Credential</DropdownMenuTrigger>
// 		//   <DropdownMenuContent>
// 		//     <For each={PROVIDER_LIST}>
// 		//       {(provider) => (
// 		//         <DropdownMenuItem
// 		//           onClick={() => {
// 		//             doAddCredential(provider)
// 		//               .then((cred) => {
// 		//                 toast.success(
// 		//                   <>
// 		//                     Credential <b>{cred.user.displayName}</b> added for{" "}
// 		//                     <b>{PROVIDER_DISPLAY_NAMES[provider]}</b>
// 		//                   </>,
// 		//                 );
// 		//               })
// 		//               .catch((e) => {
// 		//                 if (
// 		//                   e instanceof Error &&
// 		//                   e.message === WINDOW_OPEN_FAILED
// 		//                 ) {
// 		//                   toast.error(
// 		//                     "Failed to open login window. Make sure your browser isn't blocking popups.",
// 		//                   );
// 		//                 }
// 		//               });
// 		//           }}
// 		//         >
// 		//           {PROVIDER_DISPLAY_NAMES[provider]}
// 		//         </DropdownMenuItem>
// 		//       )}
// 		//     </For>
// 		//   </DropdownMenuContent>
// 		// </DropdownMenu>
// 	);
// }

const getServers = cache(async () => {
	"use server";

	const { user } = await ensureAuthedOrRedirect();

	const c = await db().query.oauthApps.findMany({
		where: eq(oauthApps.ownerId, user.id),
	});

	return c;
}, "servers");

function ServersList() {
	const servers = createAsync(() => getServers());
	const submissions = useSubmissions(addCredential);

	const pendingSubmissions = () => [...submissions].filter((s) => s.pending);

	return (
		<ul class="border border-neutral-800 rounded-lg divide-y divide-neutral-800">
			<Show when={servers()?.length === 0 && pendingSubmissions().length === 0}>
				<p class="p-4 text-sm text-medium text-center">No servers found</p>
			</Show>
			{/* <For each={pendingSubmissions()}>
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
      </For> */}
			{/* <For each={servers()}>
        {(server) => {
          const removeSubmission = useSubmission(
            removeCredential,
            (s) => s[0] === server.providerId && s[1] === server.providerUserId,
          );

          return (
            <li class="p-4 flex flex-row items-center space-x-4 text-base">
              <div>
                <h3 class="font-medium">{server.displayName}</h3>
                <span class=" text-sm text-neutral-400">
                  {PROVIDER_DISPLAY_NAMES[server.providerId]}
                </span>
              </div>
              <div class="flex-1" />
              <form
                method="post"
                action={removeCredential.with(
                  server.providerId,
                  server.providerUserId,
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
      </For> */}
		</ul>
	);
}
