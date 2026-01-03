import { action, reload } from "@solidjs/router";
import { deleteCookie } from "@solidjs/start/http";
import { getRequestEvent } from "solid-js/web";
import * as v from "valibot";

import { getAuthState, getUser } from "~/api";
import { lucia } from "~/lucia";

export const CREDENTIALS = v.object({
	email: v.pipe(v.string(), v.email()),
	password: v.pipe(v.string(), v.minLength(8)),
});

export const IS_LOGGED_IN = "isLoggedIn";

export const logOutAction = action(async () => {
	"use server";

	const authState = await getAuthState();

	if (authState) await lucia().invalidateSession(authState.session.id);

	deleteCookie(getRequestEvent()!.nativeEvent, IS_LOGGED_IN);

	throw reload({ revalidate: [getUser.key] });
});
