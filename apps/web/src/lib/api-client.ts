/**
 * API Client Service
 * Provides Postman-like HTTP request capabilities with full auth support
 */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export type AuthType = "none" | "bearer" | "basic" | "api_key" | "oauth2";

export interface AuthConfig {
	type: AuthType;
	// Bearer token
	token?: string;
	// Basic auth
	username?: string;
	password?: string;
	// API Key
	apiKey?: string;
	apiKeyHeader?: string; // default: "X-API-Key"
	// OAuth2
	accessToken?: string;
}

export interface ApiRequestConfig {
	method: HttpMethod;
	url: string;
	headers?: Record<string, string>;
	auth?: AuthConfig;
	body?: any;
	timeout?: number; // milliseconds, default 30000
	variables?: Record<string, string>; // Environment variables for interpolation
}

export interface ApiResponse<T = any> {
	status: number;
	statusText: string;
	headers: Record<string, string>;
	data: T;
	responseTime: number; // milliseconds
	timestamp: Date;
}

export interface ApiError {
	message: string;
	status?: number;
	response?: any;
}

/**
 * Interpolate variables in a string using {{variable}} syntax like Postman
 */
export function interpolateVariables(
	str: string,
	variables: Record<string, string> = {},
): string {
	return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
		return variables[key] ?? match;
	});
}

/**
 * Interpolate variables in an object recursively
 */
export function interpolateObject<T>(
	obj: T,
	variables: Record<string, string> = {},
): T {
	if (typeof obj === "string") {
		return interpolateVariables(obj, variables) as T;
	}
	if (Array.isArray(obj)) {
		return obj.map((item) => interpolateObject(item, variables)) as T;
	}
	if (obj && typeof obj === "object") {
		const result: any = {};
		for (const [key, value] of Object.entries(obj)) {
			result[key] = interpolateObject(value, variables);
		}
		return result;
	}
	return obj;
}

/**
 * Apply authentication to headers
 */
export function applyAuth(
	headers: Record<string, string>,
	auth?: AuthConfig,
): Record<string, string> {
	if (!auth || auth.type === "none") {
		return headers;
	}

	const newHeaders = { ...headers };

	switch (auth.type) {
		case "bearer":
			if (auth.token) {
				newHeaders["Authorization"] = `Bearer ${auth.token}`;
			}
			break;

		case "basic":
			if (auth.username && auth.password) {
				const credentials = btoa(`${auth.username}:${auth.password}`);
				newHeaders["Authorization"] = `Basic ${credentials}`;
			}
			break;

		case "api_key":
			if (auth.apiKey) {
				const headerName = auth.apiKeyHeader || "X-API-Key";
				newHeaders[headerName] = auth.apiKey;
			}
			break;

		case "oauth2":
			if (auth.accessToken) {
				newHeaders["Authorization"] = `Bearer ${auth.accessToken}`;
			}
			break;
	}

	return newHeaders;
}

/**
 * Make an HTTP request with full configuration
 */
export async function makeApiRequest<T = any>(
	config: ApiRequestConfig,
): Promise<ApiResponse<T>> {
	const startTime = performance.now();
	const timestamp = new Date();

	try {
		// Interpolate variables in URL
		let url = interpolateVariables(config.url, config.variables);

		// Interpolate variables in headers
		let headers = config.headers
			? interpolateObject(config.headers, config.variables)
			: {};

		// Apply authentication
		headers = applyAuth(headers, config.auth);

		// Interpolate variables in body
		let body = config.body
			? interpolateObject(config.body, config.variables)
			: undefined;

		// Set content type if body exists and not already set
		if (body && !headers["Content-Type"]) {
			headers["Content-Type"] = "application/json";
		}

		// Create abort controller for timeout
		const controller = new AbortController();
		const timeout = config.timeout || 30000;
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		try {
			const fetchOptions: RequestInit = {
				method: config.method,
				headers,
				signal: controller.signal,
			};

			// Add body for methods that support it
			if (
				body &&
				["POST", "PUT", "PATCH", "DELETE"].includes(config.method)
			) {
				fetchOptions.body =
					typeof body === "string" ? body : JSON.stringify(body);
			}

			const response = await fetch(url, fetchOptions);

			clearTimeout(timeoutId);

			const responseTime = performance.now() - startTime;

			// Parse response headers
			const responseHeaders: Record<string, string> = {};
			response.headers.forEach((value, key) => {
				responseHeaders[key] = value;
			});

			// Try to parse response body as JSON
			let data: T;
			const contentType = response.headers.get("content-type");
			if (contentType?.includes("application/json")) {
				data = await response.json();
			} else {
				data = (await response.text()) as T;
			}

			return {
				status: response.status,
				statusText: response.statusText,
				headers: responseHeaders,
				data,
				responseTime,
				timestamp,
			};
		} finally {
			clearTimeout(timeoutId);
		}
	} catch (error: any) {
		const responseTime = performance.now() - startTime;

		if (error.name === "AbortError") {
			throw {
				message: `Request timeout after ${config.timeout || 30000}ms`,
				responseTime,
			} as ApiError;
		}

		throw {
			message: error.message || "Request failed",
			status: error.status,
			response: error.response,
		} as ApiError;
	}
}

/**
 * Extract values from JSON response using JSONPath-like syntax
 * Supports simple paths like "data.user.id" or "data.items[0].name"
 */
export function extractJsonValue(obj: any, path: string): any {
	const parts = path.split(".");
	let current = obj;

	for (const part of parts) {
		if (!current) return undefined;

		// Handle array access like "items[0]"
		const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
		if (arrayMatch) {
			const [, key, index] = arrayMatch;
			current = current[key]?.[parseInt(index, 10)];
		} else {
			current = current[part];
		}
	}

	return current;
}

/**
 * Evaluate a condition against response data
 */
export function evaluateCondition(
	data: any,
	condition: {
		field: string;
		operator: "eq" | "neq" | "gt" | "lt" | "contains";
		value: any;
	},
): boolean {
	const fieldValue = extractJsonValue(data, condition.field);

	switch (condition.operator) {
		case "eq":
			return fieldValue === condition.value;
		case "neq":
			return fieldValue !== condition.value;
		case "gt":
			return fieldValue > condition.value;
		case "lt":
			return fieldValue < condition.value;
		case "contains":
			if (typeof fieldValue === "string") {
				return fieldValue.includes(condition.value);
			}
			if (Array.isArray(fieldValue)) {
				return fieldValue.includes(condition.value);
			}
			return false;
		default:
			return false;
	}
}
