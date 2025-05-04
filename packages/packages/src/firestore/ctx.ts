import { None, makePersistedOption } from "@macrograph/option";
import type { Core } from "@macrograph/runtime";
import { createSignal } from "solid-js";
import * as admin from "firebase-admin";

export const TOKEN_LOCALSTORAGE = "firestoreToken";

export function createCtx(core: Core) {
	const [accountKey, setAccountKey] = makePersistedOption<
		string | admin.ServiceAccount
	>(createSignal(None), TOKEN_LOCALSTORAGE);

	createEffect(() => {
		if (accountKey().isSome()) {
			admin.initializeApp({
				credential: admin.credential.cert(accountKey().unwrap()),
			});
		}
	});

	return {
		core,
		accountKey,
		setAccountKey,
		admin,
	};
}

export type Ctx = ReturnType<typeof createCtx>;
