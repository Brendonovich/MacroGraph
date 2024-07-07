import { redirect } from "@solidjs/router";
import type { APIEvent } from "@solidjs/start/server";

import { getOAuthLoginURL } from "../actions";
import { AuthProviders } from "../providers";

export const GET = async (event: APIEvent) => {
	const { provider } = event.params as { provider: string };

	const providerConfig = AuthProviders[provider];
	if (!providerConfig) throw new Error(`Unknown provider ${provider}`);

	const url = new URL(event.request.url);

	const stateFromSearchParam = JSON.parse(
		Buffer.from(url.searchParams.get("state")!, "base64").toString(),
	) as any;

	return redirect(await getOAuthLoginURL(provider, stateFromSearchParam));
};
