import * as commands from "./commands";

export interface ClientOptions {
	/**
	 * Defines the maximum number of redirects the client should follow.
	 * If set to 0, no redirects will be followed.
	 */
	maxRedirections?: number;
	/** Timeout in milliseconds */
	connectTimeout?: number;
}

export async function fetch(
	input: URL | Request | string,
	init?: RequestInit & ClientOptions,
): Promise<Response> {
	const maxRedirections = init?.maxRedirections;
	const connectTimeout = init?.maxRedirections;

	// Remove these fields before creating the request
	if (init) {
		init.maxRedirections = undefined;
		init.connectTimeout = undefined;
	}

	const req = new Request(input, init);
	const buffer = await req.arrayBuffer();
	const reqData = buffer.byteLength ? Array.from(new Uint8Array(buffer)) : null;

	const rid = await commands.fetch(
		req.method,
		req.url,
		Array.from(req.headers.entries()),
		reqData,
		maxRedirections ?? null,
		connectTimeout ?? null,
	);

	req.signal.addEventListener("abort", () => {
		commands.fetchCancel(rid);
	});

	const { status, statusText, url, headers } = await commands.fetchSend(rid);

	const body = await commands.fetchReadBody(rid);

	const res = new Response(new Uint8Array(body), {
		headers,
		status,
		statusText,
	});

	// url is read only but seems like we can do this
	Object.defineProperty(res, "url", { value: url });

	return res;
}
