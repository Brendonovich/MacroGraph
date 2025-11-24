/**
 * API Endpoint: Execute API Call
 * POST /api/api-tester/execute
 */

import { json } from "@solidjs/router";
import type { APIEvent } from "@solidjs/start/server";
import { makeApiRequest, type ApiRequestConfig } from "~/lib/api-client";
import { logApiCall } from "~/lib/api-logger";
import { getUser } from "~/lucia";

export async function POST({ request }: APIEvent) {
	// Check authentication
	const user = await getUser();
	if (!user) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const body = await request.json();
		const {
			name,
			method,
			url,
			headers,
			auth,
			requestBody,
			timeout,
		}: {
			name?: string;
			method: string;
			url: string;
			headers?: Record<string, string>;
			auth?: any;
			requestBody?: any;
			timeout?: number;
		} = body;

		// Validate required fields
		if (!method || !url) {
			return json(
				{ error: "Missing required fields: method, url" },
				{ status: 400 },
			);
		}

		// Build request config
		const requestConfig: ApiRequestConfig = {
			method: method as any,
			url,
			headers,
			auth,
			body: requestBody,
			timeout,
		};

		// Execute the API call
		const response = await makeApiRequest(requestConfig);

		// Log the call
		const logResult = await logApiCall({
			userId: user.id,
			name: name || `${method} ${url}`,
			request: requestConfig,
			response,
			timestamp: new Date(),
		});

		return json({
			success: true,
			response: {
				status: response.status,
				statusText: response.statusText,
				headers: response.headers,
				data: response.data,
				responseTime: response.responseTime,
			},
			logId: logResult.dbId,
			logFile: logResult.mdFile,
		});
	} catch (error: any) {
		console.error("API execution error:", error);

		// Log the failed call
		try {
			const body = await request.json();
			await logApiCall({
				userId: user.id,
				name: body.name || `${body.method} ${body.url}`,
				request: {
					method: body.method,
					url: body.url,
					headers: body.headers,
					auth: body.auth,
					body: body.requestBody,
				},
				error: {
					message: error.message || "Unknown error",
					status: error.status,
					response: error.response,
				},
				timestamp: new Date(),
			});
		} catch (logError) {
			console.error("Failed to log error:", logError);
		}

		return json(
			{
				success: false,
				error: error.message || "Request failed",
				status: error.status,
			},
			{ status: error.status || 500 },
		);
	}
}
