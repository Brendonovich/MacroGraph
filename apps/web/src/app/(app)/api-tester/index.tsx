/**
 * API Tester UI
 * A Postman-like interface for making API calls
 */

import { createSignal, createResource, For, Show } from "solid-js";
import { Title } from "@solidjs/meta";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
type AuthType = "none" | "bearer" | "basic" | "api_key" | "oauth2";

export default function ApiTester() {
	const [method, setMethod] = createSignal<HttpMethod>("GET");
	const [url, setUrl] = createSignal("");
	const [authType, setAuthType] = createSignal<AuthType>("none");
	const [bearerToken, setBearerToken] = createSignal("");
	const [username, setUsername] = createSignal("");
	const [password, setPassword] = createSignal("");
	const [apiKey, setApiKey] = createSignal("");
	const [apiKeyHeader, setApiKeyHeader] = createSignal("X-API-Key");
	const [headers, setHeaders] = createSignal<Array<[string, string]>>([["Content-Type", "application/json"]]);
	const [body, setBody] = createSignal("");
	const [response, setResponse] = createSignal<any>(null);
	const [loading, setLoading] = createSignal(false);
	const [error, setError] = createSignal("");

	const [logs] = createResource(async () => {
		const res = await fetch("/api/api-tester/logs?limit=20");
		const data = await res.json();
		return data.logs || [];
	});

	const addHeader = () => {
		setHeaders([...headers(), ["", ""]]);
	};

	const updateHeader = (index: number, key: string, value: string) => {
		const newHeaders = [...headers()];
		newHeaders[index] = [key, value];
		setHeaders(newHeaders);
	};

	const removeHeader = (index: number) => {
		setHeaders(headers().filter((_, i) => i !== index));
	};

	const executeRequest = async () => {
		setLoading(true);
		setError("");
		setResponse(null);

		try {
			// Build auth config
			let auth: any = { type: authType() };
			if (authType() === "bearer") {
				auth.token = bearerToken();
			} else if (authType() === "basic") {
				auth.username = username();
				auth.password = password();
			} else if (authType() === "api_key") {
				auth.apiKey = apiKey();
				auth.apiKeyHeader = apiKeyHeader();
			}

			// Build headers object
			const headersObj: Record<string, string> = {};
			headers().forEach(([key, value]) => {
				if (key) headersObj[key] = value;
			});

			// Parse body
			let requestBody;
			if (body() && ["POST", "PUT", "PATCH", "DELETE"].includes(method())) {
				try {
					requestBody = JSON.parse(body());
				} catch {
					requestBody = body();
				}
			}

			const res = await fetch("/api/api-tester/execute", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					method: method(),
					url: url(),
					headers: headersObj,
					auth,
					requestBody,
				}),
			});

			const data = await res.json();

			if (data.success) {
				setResponse(data);
			} else {
				setError(data.error || "Request failed");
			}
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div class="container mx-auto p-6 max-w-7xl">
			<Title>API Tester - MacroGraph</Title>
			<h1 class="text-3xl font-bold mb-6">API Tester</h1>

			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Main Request Panel */}
				<div class="lg:col-span-2 space-y-4">
					{/* URL Bar */}
					<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
						<div class="flex gap-2">
							<select
								value={method()}
								onChange={(e) => setMethod(e.target.value as HttpMethod)}
								class="px-4 py-2 border rounded-md"
							>
								<option value="GET">GET</option>
								<option value="POST">POST</option>
								<option value="PUT">PUT</option>
								<option value="PATCH">PATCH</option>
								<option value="DELETE">DELETE</option>
								<option value="HEAD">HEAD</option>
								<option value="OPTIONS">OPTIONS</option>
							</select>
							<input
								type="text"
								value={url()}
								onInput={(e) => setUrl(e.target.value)}
								placeholder="https://api.example.com/endpoint"
								class="flex-1 px-4 py-2 border rounded-md"
							/>
							<button
								onClick={executeRequest}
								disabled={loading()}
								class="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
							>
								{loading() ? "Sending..." : "Send"}
							</button>
						</div>
					</div>

					{/* Auth */}
					<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
						<h2 class="text-xl font-semibold mb-3">Authentication</h2>
						<select
							value={authType()}
							onChange={(e) => setAuthType(e.target.value as AuthType)}
							class="w-full px-4 py-2 border rounded-md mb-3"
						>
							<option value="none">No Auth</option>
							<option value="bearer">Bearer Token</option>
							<option value="basic">Basic Auth</option>
							<option value="api_key">API Key</option>
							<option value="oauth2">OAuth 2.0</option>
						</select>

						<Show when={authType() === "bearer"}>
							<input
								type="text"
								value={bearerToken()}
								onInput={(e) => setBearerToken(e.target.value)}
								placeholder="Token"
								class="w-full px-4 py-2 border rounded-md"
							/>
						</Show>

						<Show when={authType() === "basic"}>
							<div class="space-y-2">
								<input
									type="text"
									value={username()}
									onInput={(e) => setUsername(e.target.value)}
									placeholder="Username"
									class="w-full px-4 py-2 border rounded-md"
								/>
								<input
									type="password"
									value={password()}
									onInput={(e) => setPassword(e.target.value)}
									placeholder="Password"
									class="w-full px-4 py-2 border rounded-md"
								/>
							</div>
						</Show>

						<Show when={authType() === "api_key"}>
							<div class="space-y-2">
								<input
									type="text"
									value={apiKeyHeader()}
									onInput={(e) => setApiKeyHeader(e.target.value)}
									placeholder="Header Name (e.g., X-API-Key)"
									class="w-full px-4 py-2 border rounded-md"
								/>
								<input
									type="text"
									value={apiKey()}
									onInput={(e) => setApiKey(e.target.value)}
									placeholder="API Key"
									class="w-full px-4 py-2 border rounded-md"
								/>
							</div>
						</Show>
					</div>

					{/* Headers */}
					<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
						<div class="flex justify-between items-center mb-3">
							<h2 class="text-xl font-semibold">Headers</h2>
							<button
								onClick={addHeader}
								class="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-md text-sm"
							>
								Add Header
							</button>
						</div>
						<div class="space-y-2">
							<For each={headers()}>
								{([key, value], index) => (
									<div class="flex gap-2">
										<input
											type="text"
											value={key}
											onInput={(e) => updateHeader(index(), e.target.value, value)}
											placeholder="Header name"
											class="flex-1 px-3 py-2 border rounded-md"
										/>
										<input
											type="text"
											value={value}
											onInput={(e) => updateHeader(index(), key, e.target.value)}
											placeholder="Value"
											class="flex-1 px-3 py-2 border rounded-md"
										/>
										<button
											onClick={() => removeHeader(index())}
											class="px-3 py-2 bg-red-500 text-white rounded-md"
										>
											×
										</button>
									</div>
								)}
							</For>
						</div>
					</div>

					{/* Body */}
					<Show when={["POST", "PUT", "PATCH", "DELETE"].includes(method())}>
						<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
							<h2 class="text-xl font-semibold mb-3">Request Body</h2>
							<textarea
								value={body()}
								onInput={(e) => setBody(e.target.value)}
								placeholder='{"key": "value"}'
								class="w-full h-48 px-4 py-2 border rounded-md font-mono text-sm"
							/>
						</div>
					</Show>

					{/* Response */}
					<Show when={response()}>
						<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
							<h2 class="text-xl font-semibold mb-3">
								Response ({response()?.response?.status} {response()?.response?.statusText})
							</h2>
							<p class="text-sm text-gray-600 mb-2">
								Time: {response()?.response?.responseTime?.toFixed(2)}ms
							</p>
							<pre class="bg-gray-100 dark:bg-gray-900 p-4 rounded-md overflow-auto max-h-96 text-sm">
								{JSON.stringify(response()?.response?.data, null, 2)}
							</pre>
							<p class="text-sm text-gray-600 mt-2">
								Logged to: {response()?.logFile}
							</p>
						</div>
					</Show>

					<Show when={error()}>
						<div class="bg-red-50 border border-red-200 rounded-lg p-4">
							<p class="text-red-800 font-semibold">Error</p>
							<p class="text-red-600">{error()}</p>
						</div>
					</Show>
				</div>

				{/* Sidebar - Recent Logs */}
				<div class="lg:col-span-1">
					<div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sticky top-6">
						<h2 class="text-xl font-semibold mb-3">Recent Logs</h2>
						<div class="space-y-2 max-h-[600px] overflow-y-auto">
							<Show when={!logs.loading} fallback={<p>Loading...</p>}>
								<For each={logs()}>
									{(log: any) => (
										<div class="p-3 bg-gray-50 dark:bg-gray-900 rounded-md text-sm">
											<div class="font-semibold">{log.name || "Unnamed"}</div>
											<div class="text-gray-600">
												{log.method} {log.url.substring(0, 40)}
												{log.url.length > 40 ? "..." : ""}
											</div>
											<div class="text-xs text-gray-500 mt-1">
												{new Date(log.timestamp).toLocaleString()}
											</div>
											<Show when={log.responseStatus}>
												<div class={log.responseStatus < 400 ? "text-green-600" : "text-red-600"}>
													Status: {log.responseStatus}
												</div>
											</Show>
										</div>
									)}
								</For>
							</Show>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
