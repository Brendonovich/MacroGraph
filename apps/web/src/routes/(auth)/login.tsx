import { Argon2id } from "oslo/password";
import { eq } from "drizzle-orm";
import { A, action, redirect, useSubmission } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import { appendResponseHeader } from "@solidjs/start/server";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { db } from "~/drizzle";
import { users } from "~/drizzle/schema";
import { lucia } from "~/lucia";
import { CREDENTIALS } from "./utils";

const loginWithCredentials = action(async (form: FormData) => {
  "use server";

  const data = CREDENTIALS.parse({
    email: form.get("email"),
    password: form.get("password"),
  });

  const user = await db.query.users.findFirst({
    where: eq(users.email, data.email),
  });
  if (!user) return { success: false, error: "email-invalid" };

  const validPassword = await new Argon2id().verify(
    user.hashedPassword,
    data.password
  );
  if (!validPassword) return { success: false, error: "password-invalid" };

  const session = await lucia.createSession(user.id, {});
  const sessionCookie = lucia.createSessionCookie(session.id);

  appendResponseHeader(
    getRequestEvent()!,
    "Set-Cookie",
    sessionCookie.serialize()
  );

  throw redirect("/connections");
});

export default function () {
  const loginSubmission = useSubmission(loginWithCredentials);

  return (
    <div class="text-white text-center space-y-4 flex flex-col items-center">
      <h1 class="font-semibold text-3xl">Log in to MacroGraph</h1>
      <form action={loginWithCredentials} method="post">
        <fieldset
          class="space-y-2 max-w-[16rem] w-full"
          disabled={loginSubmission.pending}
        >
          <Input name="email" type="email" placeholder="Email Address" />
          <Input name="password" type="password" placeholder="Password" />
          <Button class="w-full">Log in</Button>
          <span>
            Don't have an account? <A href="../signup">Sign Up</A>
          </span>
        </fieldset>
      </form>
    </div>
  );
}
