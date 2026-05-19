import * as commands from "./commands";

async function completeFetch(rid: number): Promise<Response> {
	const { status, statusText, url, headers } = await commands.fetchSend(rid);
	const body = await commands.fetchReadBody(rid);

	const res =
		body.length === 0
			? new Response(new Uint8Array(body))
			: new Response(new Uint8Array(body), {
					headers,
					status,
					statusText,
				});

	Object.defineProperty(res, "url", { value: url });
	return res;
}

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

	return completeFetch(rid);
}

/** POST multipart/form-data with an optional file streamed from disk in Rust. */
export async function fetchMultipart(
	url: string,
	fields: Record<string, string>,
	file?: { path: string; fieldName: string },
): Promise<Response> {
	const rid = await commands.fetchMultipart(
		url,
		Object.entries(fields),
		file?.path ?? null,
		file?.fieldName ?? null,
		null,
	);
	return completeFetch(rid);
}
