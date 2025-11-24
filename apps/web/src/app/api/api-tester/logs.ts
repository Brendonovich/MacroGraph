/**
 * API Endpoint: API Call Logs
 * GET /api/api-tester/logs - List API call logs
 */

import { json } from "@solidjs/router";
import type { APIEvent } from "@solidjs/start/server";
import { getUser } from "~/lucia";
import { getLogsFromDatabase, getLogById } from "~/lib/api-logger";

export async function GET({ request }: APIEvent) {
	const user = await getUser();
	if (!user) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const url = new URL(request.url);
		const id = url.searchParams.get("id");
		const limit = parseInt(url.searchParams.get("limit") || "100");

		// Get single log by ID
		if (id) {
			const log = await getLogById(user.id, parseInt(id));
			if (!log) {
				return json({ error: "Log not found" }, { status: 404 });
			}
			return json({ log });
		}

		// Get all logs
		const logs = await getLogsFromDatabase(user.id, limit);
		return json({ logs });
	} catch (error: any) {
		console.error("Error fetching logs:", error);
		return json({ error: "Failed to fetch logs" }, { status: 500 });
	}
}
