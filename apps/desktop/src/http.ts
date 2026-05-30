export interface ClientOptions {
	maxRedirections?: number;
	connectTimeout?: number;
}

export async function fetch(
	input: URL | Request | string,
	init?: RequestInit & ClientOptions,
): Promise<Response> {
	const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
	const method = init?.method ?? "GET";
	const rawHeaders = init?.headers ?? {};
	const headers: [string, string][] = rawHeaders instanceof Headers
		? Array.from(rawHeaders.entries())
		: Object.entries(rawHeaders);
	const bodyData = init?.body ? Array.from(new Uint8Array(await new Response(init.body).arrayBuffer())) : null;
	const connectTimeout = init?.connectTimeout ?? null;
	const maxRedirections = init?.maxRedirections ?? null;

	const rid = await window.electronAPI.http.fetch({
		method,
		url,
		headers,
		data: bodyData,
		connectTimeout,
		maxRedirections,
	});

	if (init?.signal) {
		init.signal.addEventListener("abort", () => {
			window.electronAPI.http.fetchCancel(rid);
		});
	}

	const response = await window.electronAPI.http.fetchSend(rid);
	const body = await window.electronAPI.http.fetchReadBody(rid);

	const res = new Response(body.length > 0 ? new Uint8Array(body) : null, {
		status: response.status,
		statusText: response.statusText,
		headers: response.headers,
	});

	Object.defineProperty(res, "url", { value: response.url });

	return res;
}

export async function fetchMultipart(
	url: string,
	fields: Record<string, string>,
	file?: { path: string; fieldName: string },
	options?: { headers?: Record<string, string>; onProgress?: (percent: number, sent: number, total: number) => void },
): Promise<Response> {
	const rawHeaders = options?.headers ?? {};
	const headers: [string, string][] = rawHeaders instanceof Headers
		? Array.from(rawHeaders.entries())
		: Object.entries(rawHeaders);
	const fieldEntries: [string, string][] = Object.entries(fields);

	const rid = await window.electronAPI.http.fetchMultipart({
		url,
		headers,
		fields: fieldEntries,
		filePath: file?.path ?? null,
		fileFieldName: file?.fieldName ?? null,
		connectTimeout: null,
	});

	let unlisten: (() => void) | undefined;
	if (options?.onProgress && file) {
		unlisten = window.electronAPI.onEvent("http-upload-progress", (payload: unknown) => {
			const { rid: eventRid, percent, sent, total } = payload as { rid: number; percent: number; sent: number; total: number };
			if (eventRid === rid) options.onProgress!(percent, sent, total);
		});
	}

	try {
		const response = await window.electronAPI.http.fetchSend(rid);
		const body = await window.electronAPI.http.fetchReadBody(rid);

		return new Response(body.length > 0 ? new Uint8Array(body) : null, {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers,
		});
	} finally {
		unlisten?.();
	}
}
