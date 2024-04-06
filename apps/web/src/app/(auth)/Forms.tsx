import { action, useAction, useSubmission } from "@solidjs/router";
import { Input, Button } from "@macrograph/ui";
import { appendResponseHeader, setCookie } from "vinxi/http";
import { Argon2id } from "oslo/password";
import { eq } from "drizzle-orm";

import { db } from "~/drizzle";
import { users } from "~/drizzle/schema";
import { lucia } from "~/lucia";
import { CREDENTIALS, IS_LOGGED_IN } from "./utils";
import { generateId } from "lucia";

async function createSession(userId: string) {
  "use server";

  const session = await lucia.createSession(userId, {});
  const sessionCookie = lucia.createSessionCookie(session.id);

  appendResponseHeader("Set-Cookie", sessionCookie.serialize());
  setCookie(IS_LOGGED_IN, "true", { httpOnly: false });
}

const signUp = action(async (form: FormData) => {
  "use server";

  const data = CREDENTIALS.parse({
    email: form.get("email"),
    password: form.get("password"),
  });

  const hashedPassword = await new Argon2id().hash(data.password);
  const userId = generateId(15);

  await db.insert(users).values({
    id: userId,
    email: data.email,
    hashedPassword,
  });

  await createSession(userId);
});

const doLoginWithCredentials = action(async (form: FormData) => {
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

  await createSession(user.id);
});

export function LoginForm(props: {
  onSignup?: () => void;
  onLogin?: () => void;
}) {
  const loginWithCredentials = useAction(doLoginWithCredentials);
  const loginSubmission = useSubmission(doLoginWithCredentials);

  return (
    <div class="text-white text-center space-y-4 flex flex-col items-center">
      <h1 class="font-semibold text-3xl">Log in to MacroGraph</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          loginWithCredentials(new FormData(e.currentTarget)).then(() =>
            props.onLogin?.()
          );
        }}
      >
        <fieldset
          class="space-y-2 max-w-[16rem] w-full"
          disabled={loginSubmission.pending}
        >
          <Input name="email" type="email" placeholder="Email Address" />
          <Input name="password" type="password" placeholder="Password" />
          <Button class="w-full">Log in</Button>
          <hr />
          <span>
            Don't have an account?{" "}
            <button type="button" onClick={() => props.onSignup?.()}>
              Sign Up
            </button>
          </span>
        </fieldset>
      </form>
    </div>
  );
}

function SignUpForm(props: { onLogin?: () => void; onSignup?: () => void }) {
  const submission = useSubmission(signUp);

  return (
    <div class="text-white text-center space-y-4 flex flex-col items-center">
      <h1 class="font-semibold text-3xl">Sign up to MacroGraph</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          signUp(new FormData(e.currentTarget)).then(() => props.onSignup?.());
        }}
      >
        <fieldset
          class="space-y-2 max-w-[16rem] w-full"
          disabled={submission.pending}
        >
          <Input name="email" type="email" placeholder="Email Address" />
          <Input name="password" type="password" placeholder="Password" />
          <Button class="w-full">Create Account</Button>
          <hr />
          <span class="mt-2">
            Already have an account?{" "}
            <button type="button" onClick={() => props.onLogin?.()}>
              Log in
            </button>
          </span>
        </fieldset>
      </form>
    </div>
  );
}

export { SignUpForm };
