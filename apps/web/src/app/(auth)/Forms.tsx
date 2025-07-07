import { Button, Input } from "@macrograph/ui";
import { action, useAction, useSubmission } from "@solidjs/router";
import { eq } from "drizzle-orm";
import { generateId } from "lucia";
import { Argon2id } from "oslo/password";
import * as v from "valibot";
import { appendResponseHeader, setCookie } from "vinxi/http";

import { db } from "~/drizzle";
import { users } from "~/drizzle/schema";
import { lucia } from "~/lucia";
import {
	posthogCapture,
	posthogIdentify,
	posthogShutdown,
} from "~/posthog/server";
import { CREDENTIALS, IS_LOGGED_IN } from "./utils";

async function createSession(userId: string) {
	"use server";

	const session = await lucia.createSession(userId, {});
	const sessionCookie = lucia.createSessionCookie(session.id);

	appendResponseHeader("Set-Cookie", sessionCookie.serialize());
	setCookie(IS_LOGGED_IN, "true", { httpOnly: false });
}

const signUpAction = action(async (form: FormData) => {
	"use server";

	try {
		const result = v.safeParse(CREDENTIALS, {
			email: form.get("email"),
			password: form.get("password"),
		});

		if (!result.success) {
			throw result.issues[0].message;
		}
		const { output: data } = result;

		const hashedPassword = await new Argon2id().hash(data.password);
		const userId = generateId(15);

		await db.insert(users).values({
			id: userId,
			email: data.email,
			hashedPassword,
		});

		posthogIdentify(userId, { email: data.email });
		posthogCapture({
			distinctId: userId,
			event: "user signed up",
		});
		await posthogShutdown();

		await createSession(userId);

		return { success: true, userId } as const;
	} catch (e: any) {
		return { success: false, error: e.toString() } as const;
	}
});

const loginWithCredentialsAction = action(async (form: FormData) => {
	"use server";

	try {
		const result = v.safeParse(CREDENTIALS, {
			email: form.get("email"),
			password: form.get("password"),
		});

		if (!result.success) throw "Invalid credentials";
		const { output: data } = result;

		const user = await db.query.users.findFirst({
			where: eq(users.email, data.email),
		});
		if (!user) throw "Invalid credentials";

		const validPassword = await new Argon2id().verify(
			user.hashedPassword,
			data.password,
		);
		if (!validPassword) throw "Invalid credentials";

		await createSession(user.id);

		posthogCapture({
			distinctId: user.id,
			event: "user logged in",
		});
		await posthogShutdown();

		return { success: true, userId: user.id } as const;
	} catch (e: any) {
		return { success: false, error: e.toString() } as const;
	}
});

export function LoginForm(props: {
	onSignup?: () => void;
	onLogin?: (userId: string) => void;
}) {
	const loginWithCredentials = useAction(loginWithCredentialsAction);
	const submission = useSubmission(loginWithCredentialsAction);

	return (
		<div class="text-white text-center space-y-4 flex flex-col items-center">
			<h1 class="font-semibold text-3xl">Log in to MacroGraph</h1>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					loginWithCredentials(new FormData(e.currentTarget)).then(
						(data) => data.success && props.onLogin?.(data.userId),
					);
				}}
			>
				<fieldset
					class="space-y-2 max-w-[16rem] w-full"
					disabled={submission.pending}
				>
					<Input name="email" type="email" placeholder="Email Address" />
					<Input name="password" type="password" placeholder="Password" />
					{!submission.result?.success && (
						<span class="text-red-300">{submission.result?.error}</span>
					)}
					<Button class="w-full">Log in</Button>
					<hr />
					<span>
						Don't have an account?{" "}
						<button
							class="underline"
							type="button"
							onClick={() => props.onSignup?.()}
						>
							Sign Up
						</button>
					</span>
				</fieldset>
			</form>
		</div>
	);
}

function SignUpForm(props: {
	onLogin?: () => void;
	onSignup?: (id: string) => void;
}) {
	const signUp = useAction(signUpAction);
	const submission = useSubmission(signUpAction);

	return (
		<div class="text-white text-center space-y-4 flex flex-col items-center">
			<h1 class="font-semibold text-3xl">Sign up to MacroGraph</h1>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					signUp(new FormData(e.currentTarget)).then(
						(data) => data.success && props.onSignup?.(data.userId),
					);
				}}
			>
				<fieldset
					class="space-y-2 max-w-[16rem] w-full"
					disabled={submission.pending}
				>
					<Input name="email" type="email" placeholder="Email Address" />
					<Input name="password" type="password" placeholder="Password" />
					{!submission.result?.success && (
						<span class="text-red-300">{submission.result?.error}</span>
					)}
					<Button class="w-full">Create Account</Button>
					<hr />
					<span class="mt-2">
						Already have an account?{" "}
						<button
							class="underline"
							type="button"
							onClick={() => props.onLogin?.()}
						>
							Log in
						</button>
					</span>
				</fieldset>
			</form>
		</div>
	);
}

export { SignUpForm };
