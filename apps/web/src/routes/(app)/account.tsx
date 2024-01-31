import { action, redirect, useAction, useSubmission } from "@solidjs/router";
import { appendResponseHeader } from "@solidjs/start/server";
import { getRequestEvent } from "solid-js/web";

import { ensureAuthenticated } from "~/api";
import { Button } from "~/components/ui/button";
import { lucia } from "~/lucia";

const logOutAction = action(async () => {
  "use server";

  const { session } = await ensureAuthenticated();

  await lucia.invalidateSession(session.id);

  const sessionCookie = lucia.createBlankSessionCookie();
  appendResponseHeader(
    getRequestEvent()!,
    "Set-Cookie",
    sessionCookie.serialize()
  );

  throw redirect("/");
});

export default function () {
  const logOut = useAction(logOutAction);
  const logOutSubmission = useSubmission(logOutAction);

  return (
    <div class="space-y-4">
      <header class="flex flex-row justify-between items-start">
        <div class="space-y-1.5">
          <h1 class="text-3xl font-medium">Account</h1>
          <p class="text-sm text-neutral-400">Manage your MacroGraph account</p>
        </div>
        <Button onClick={() => logOut()} disabled={logOutSubmission.pending}>
          {logOutSubmission.pending ? "Logging Out" : "Log Out"}
        </Button>
      </header>
    </div>
  );
}
