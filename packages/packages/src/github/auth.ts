import type * as OctokitTypes from "@octokit/types";

export type AnyResponse = OctokitTypes.OctokitResponse<any>;
export type StrategyInterface = OctokitTypes.StrategyInterface<
	[StrategyOption],
	[],
	Authentication
>;
export type EndpointDefaults = OctokitTypes.EndpointDefaults;
export type EndpointOptions = OctokitTypes.EndpointOptions;
export type RequestParameters = OctokitTypes.RequestParameters;
export type RequestInterface = OctokitTypes.RequestInterface;
export type Route = OctokitTypes.Route;

export type Token = string;
export type Callback = () => Token | undefined;
export type StrategyOption = {
	callback: Callback;
	refresh: () => void | Promise<void>;
};

export type UnauthenticatedAuthentication = {
	type: "unauthenticated";
};
export type OAuthTokenAuthentication = {
	type: "token";
	tokenType: "oauth";
	token: Token;
};
export type InstallationTokenAuthentication = {
	type: "token";
	tokenType: "installation";
	token: Token;
};
export type AppAuthentication = {
	type: "token";
	tokenType: "app";
	token: Token;
};
export type Authentication =
	| UnauthenticatedAuthentication
	| OAuthTokenAuthentication
	| InstallationTokenAuthentication
	| AppAuthentication;

export type Types = {
	StrategyOptions: StrategyOption;
	AuthOptions: never;
	Authentication: Authentication;
};

export async function auth({
	callback,
}: StrategyOption): Promise<Authentication> {
	const result = callback();

	if (!result) {
		return {
			type: "unauthenticated",
		};
	}

	const token = result.replace(/^(token|bearer) +/i, "");

	const tokenType =
		token.split(/\./).length === 3
			? "app"
			: /^v\d+\./.test(token)
				? "installation"
				: "oauth";

	return {
		type: "token",
		token: token,
		tokenType,
	};
}

export const createCallbackAuth: StrategyInterface =
	function createCallbackAuth(options: StrategyOption) {
		if (!options || !options.callback) {
			throw new Error(
				"[@octokit/auth-callback] No options.callback passed to createCallbackAuth",
			);
		}

		if (typeof options.callback !== "function") {
			throw new Error(
				"[@octokit/auth-callback] options.callback passed to createCallbackAuth is not a function",
			);
		}

		return Object.assign(auth.bind(null, options), {
			hook: hook.bind(null, options),
		});
	};

export async function hook(
	{ callback, refresh }: StrategyOption,
	request: RequestInterface,
	route: Route | EndpointOptions,
	parameters?: RequestParameters,
): Promise<AnyResponse> {
	const endpoint: EndpointDefaults = request.endpoint.merge(
		route as string,
		parameters,
	);

	try {
		const result = callback();
		if (!result) {
			return request(endpoint as EndpointOptions);
		}

		const token = result.replace(/^(token|bearer) +/i, "");
		endpoint.headers.authorization = withAuthorizationPrefix(token);

		return await request(endpoint as EndpointOptions);
	} catch {
		await refresh();

		const result = callback();
		if (!result) {
			return request(endpoint as EndpointOptions);
		}

		const token = result.replace(/^(token|bearer) +/i, "");
		endpoint.headers.authorization = withAuthorizationPrefix(token);

		return await request(endpoint as EndpointOptions);
	}
}

export function withAuthorizationPrefix(token: string) {
	if (token.split(/\./).length === 3) {
		return `bearer ${token}`;
	}

	return `token ${token}`;
}
