/**
 * API Endpoint: Environment Variables Management
 * GET /api/api-tester/environments - List environments
 * POST /api/api-tester/environments - Create/Update environment
 * DELETE /api/api-tester/environments - Delete environment
 */

import { json } from "@solidjs/router";
import type { APIEvent } from "@solidjs/start/server";
import { eq, and } from "drizzle-orm";
import { db } from "~/drizzle";
import { apiEnvironments } from "~/drizzle/schema";
import { getUser } from "~/lucia";

// List environments
export async function GET({ request }: APIEvent) {
	const user = await getUser();
	if (!user) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const url = new URL(request.url);
		const id = url.searchParams.get("id");

		// Get single environment by ID
		if (id) {
			const results = await db
				.select()
				.from(apiEnvironments)
				.where(
					and(
						eq(apiEnvironments.id, parseInt(id)),
						eq(apiEnvironments.userId, user.id),
					),
				)
				.limit(1);

			const env = results[0];
			if (!env) {
				return json({ error: "Environment not found" }, { status: 404 });
			}
			return json({ environment: env });
		}

		// Get all environments
		const environments = await db
			.select()
			.from(apiEnvironments)
			.where(eq(apiEnvironments.userId, user.id))
			.orderBy(apiEnvironments.createdAt);

		return json({ environments });
	} catch (error: any) {
		console.error("Error fetching environments:", error);
		return json({ error: "Failed to fetch environments" }, { status: 500 });
	}
}

// Create or update environment
export async function POST({ request }: APIEvent) {
	const user = await getUser();
	if (!user) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { id, name, variables } = body;

		// Validate required fields
		if (!name || !variables) {
			return json(
				{ error: "Missing required fields: name, variables" },
				{ status: 400 },
			);
		}

		// Validate variables is an object
		if (typeof variables !== "object" || Array.isArray(variables)) {
			return json(
				{ error: "Variables must be an object" },
				{ status: 400 },
			);
		}

		// Update existing environment
		if (id) {
			await db
				.update(apiEnvironments)
				.set({
					name,
					variables,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(apiEnvironments.id, id),
						eq(apiEnvironments.userId, user.id),
					),
				);

			return json({ success: true, environmentId: id });
		}

		// Create new environment
		const result = await db
			.insert(apiEnvironments)
			.values({
				userId: user.id,
				name,
				variables,
			})
			.returning({ id: apiEnvironments.id });

		return json({ success: true, environmentId: result[0].id });
	} catch (error: any) {
		console.error("Error saving environment:", error);
		return json(
			{ error: error.message || "Failed to save environment" },
			{ status: 500 },
		);
	}
}

// Delete environment
export async function DELETE({ request }: APIEvent) {
	const user = await getUser();
	if (!user) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const url = new URL(request.url);
		const id = url.searchParams.get("id");

		if (!id) {
			return json({ error: "Missing environment ID" }, { status: 400 });
		}

		await db
			.delete(apiEnvironments)
			.where(
				and(
					eq(apiEnvironments.id, parseInt(id)),
					eq(apiEnvironments.userId, user.id),
				),
			);

		return json({ success: true });
	} catch (error: any) {
		console.error("Error deleting environment:", error);
		return json({ error: "Failed to delete environment" }, { status: 500 });
	}
}
