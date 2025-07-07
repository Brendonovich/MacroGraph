import { Button } from "@macrograph/ui";
import {
  action,
  cache,
  createAsync,
  useAction,
  useSearchParams,
  useSubmission,
} from "@solidjs/router";
import { eq } from "drizzle-orm";
import { Switch } from "solid-js";
import { Match } from "solid-js";
import { createSignal, onMount } from "solid-js";

import { ensureAuthedOrRedirect, getAuthState } from "~/api";
import Screenshot from "~/assets/App Logo.png";
import { db } from "~/drizzle";
import { deviceCodeSessions } from "~/drizzle/schema";

const verifyUserCodeAction = action(async (userCode: string) => {
  "use server";

  const deviceSession = await db.query.deviceCodeSessions.findFirst({
    where: eq(deviceCodeSessions.userCode, userCode),
  });

  return !!deviceSession;
});

const grantAccessAction = action(async (userCode: string) => {
  "use server";

  const { user } = await ensureAuthedOrRedirect();

  return await db.transaction(async (db) => {
    const deviceSession = await db.query.deviceCodeSessions.findFirst({
      where: eq(deviceCodeSessions.userCode, userCode),
    });

    if (!deviceSession) return { error: "Device session not found" };
    if (deviceSession.userId) return { error: "Device already claimed" };

    await db
      .update(deviceCodeSessions)
      .set({ userId: user.id })
      .where(eq(deviceCodeSessions.userCode, userCode));
  });
});

const getAuth = cache(ensureAuthedOrRedirect, "getAuth");

export default function Page() {
  const auth = createAsync(() => getAuth(), { deferStream: true });

  const [step, setStep] = createSignal<"enter-code" | "confirmation">(
    "enter-code",
  );

  const [searchParams, setSearchParams] = useSearchParams<{
    userCode?: string;
  }>();

  const [code, setCode] = createSignal<string>(searchParams.userCode ?? "");

  return (
    <div class="mx-auto w-full max-w-lg flex flex-col items-center h-full">
      <div class="flex-1 flex flex-row items-end justify-center">
        <div class="flex flex-row items-center mb-8 space-x-4">
          <img src={Screenshot} class="w-24" alt="MacroGraph App Icon" />
          <span class="text-5xl font-black mx-1">MacroGraph</span>
        </div>
      </div>

      <div class="p-6 bg-neutral-800 border border-neutral-700 rounded-lg flex flex-col items-center space-y-5 text-center">
        <Switch>
          <Match when={step() === "enter-code"}>
            {(_) => {
              const verifyUserCode = useAction(verifyUserCodeAction);
              const submission = useSubmission(verifyUserCodeAction);

              const verifyAndContinue = (code: string) =>
                verifyUserCode(code).then((valid) => {
                  if (valid) setStep("confirmation");
                });

              onMount(() => {
                const c = code();
                if (c) verifyAndContinue(c);

                setSearchParams({ userCode: undefined });
              });

              return (
                <>
                  <span class="font-medium text-3xl">
                    Device Authentication
                  </span>

                  <span>
                    <span class="text-gray-200">Logged in as </span>
                    <b>{auth()?.user.email}</b>
                  </span>

                  <span>
                    <b>Enter the code displayed on your device</b>
                  </span>

                  <input
                    type="text"
                    class="w-full h-16 text-3xl font-bold text-center bg-neutral-700 rounded border-neutral-600"
                    value={code()}
                    onInput={(e) => {
                      const value = e.currentTarget.value;
                      if (value.length > 9) return;
                      setCode(e.currentTarget.value);
                    }}
                  />

                  <Button
                    class="w-full"
                    disabled={submission.pending && code().length < 9}
                    onClick={() => {
                      verifyAndContinue(code());
                    }}
                  >
                    Continue
                  </Button>

                  <p class="text-gray-400 text-sm mx-2">
                    MacroGraph staff will never ask you to enter your code on
                    this page
                  </p>
                </>
              );
            }}
          </Match>
          <Match when={step() === "confirmation"}>
            {(_) => {
              const grantAccess = useAction(grantAccessAction);
              const submission = useSubmission(grantAccessAction);

              return (
                <>
                  <span class="font-medium text-3xl">
                    Confirm Authentication
                  </span>

                  <span>
                    <span class="text-gray-200">Logged in as </span>
                    <b>{auth()?.user.email}</b>
                  </span>

                  <p>
                    Are you sure you want to grant access to your MacroGraph
                    account? The device will have access to all your
                    credentials.
                  </p>
                  <div class="flex flex-row gap-2 w-full">
                    <Button
                      variant="ghost"
                      class="flex-1"
                      disabled={submission.pending}
                      onClick={() => {
                        window.location.pathname = "/";
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      class="flex-1"
                      disabled={submission.pending}
                      onClick={() => {
                        grantAccess(code()).then(() => {
                          window.close();
                        });
                      }}
                    >
                      Continue
                    </Button>
                  </div>
                </>
              );
            }}
          </Match>
        </Switch>
      </div>

      <div class="flex-1"></div>
    </div>
  );
}
