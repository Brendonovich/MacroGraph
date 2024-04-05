import { generateId } from "lucia";
import { A, action, redirect } from "@solidjs/router";

import { db } from "~/drizzle";
import { users } from "~/drizzle/schema";
import { lucia } from "~/lucia";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { CREDENTIALS, hashPassword } from "./utils";
import { env } from "~/env/server";

const signUp = action(async (form: FormData) => {
  "use server";

  const data = CREDENTIALS.parse({
    email: form.get("email"),
    password: form.get("password"),
  });

  const hashedPassword = await hashPassword(data.password, env.AUTH_SECRET);

  const userId = generateId(15);

  await db.insert(users).values({
    id: userId,
    email: data.email,
    hashedPassword,
  });

  const session = await lucia.createSession(userId, {});
  const sessionCookie = lucia.createSessionCookie(session.id);

  return redirect("/credentials", {
    headers: {
      "Set-Cookie": sessionCookie.serialize(),
    },
  });
});

export default function () {
  return (
    <div class="text-white text-center space-y-4 flex flex-col items-center">
      <h1 class="font-semibold text-3xl">Sign up to MacroGraph</h1>
      <form
        action={signUp}
        method="post"
        class="space-y-2 max-w-[16rem] w-full"
      >
        <Input name="email" type="email" placeholder="Email Address" />
        <Input name="password" type="password" placeholder="Password" />
        <Button class="w-full">Create Account</Button>
        <span>
          Already have an account? <A href="../login">Log in</A>
        </span>
      </form>
    </div>
  );
}
