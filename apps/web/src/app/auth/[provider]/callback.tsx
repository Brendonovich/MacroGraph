import { APIHandler } from "@solidjs/start/server";
import { renderToString } from "solid-js/web";

import { AuthProviders } from "../providers";
import responderScript from "../responderScript.js?raw";
import responderScriptWeb from "../responderScript-web?raw";
import { exchangeOAuthToken, validateCallbackSearchParams } from "../actions";

export const GET: APIHandler = async (event) => {
	const { provider } = event.params as { provider: string };

	const providerConfig = AuthProviders[provider];
	if (!providerConfig) throw new Error(`Unknown provider ${provider}`);

	const params = await validateCallbackSearchParams(
		new URL(event.request.url).searchParams,
	);

	switch (params.state.env) {
		case "desktop": {
			const token = await exchangeOAuthToken(providerConfig, params);

			return Response.redirect(
				`http://localhost:${params.state.port}?token=${Buffer.from(
					JSON.stringify(token),
				).toString("base64")}`,
			);
		}
		case "web": {
			const token = await exchangeOAuthToken(providerConfig, params);

			const { targetOrigin } = params.state;

			return new Response(
				renderToString(() => (
					<script
						data-token={JSON.stringify(token)}
						data-target-origin={targetOrigin}
					>
						{responderScriptWeb}
					</script>
				)),
				{ headers: { "Content-Type": "text/html" } },
			);
		}
		case "credentials": {
			const { targetOrigin } = params.state;

			return new Response(
				renderToString(() => (
					<script data-target-origin={targetOrigin}>{responderScript}</script>
				)),
				{ headers: { "Content-Type": "text/html" } },
			);
		}
	}
};
