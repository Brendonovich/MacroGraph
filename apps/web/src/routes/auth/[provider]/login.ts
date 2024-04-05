import { APIEvent } from "@solidjs/start/server";
import { redirect } from "@solidjs/router";

import { AuthProviders } from "../providers";
import { getOAuthLoginURL } from "../actions";

export const GET = async (event: APIEvent) => {
  const { provider } = event.params as { provider: string };

  const providerConfig = AuthProviders[provider];
  if (!providerConfig) throw new Error(`Unknown provider ${provider}`);

  const url = new URL(event.request.url);

  const stateFromSearchParam = JSON.parse(
    Buffer.from(url.searchParams.get("state")!, "base64").toString()
  ) as any;

  return redirect(await getOAuthLoginURL(provider, stateFromSearchParam));
};
