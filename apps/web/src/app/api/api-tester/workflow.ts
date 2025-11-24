/**
 * API Endpoint: Workflow Management
 * POST /api/api-tester/workflow - Create/Update workflow
 * GET /api/api-tester/workflow - List workflows
 * DELETE /api/api-tester/workflow - Delete workflow
 */

import { json } from "@solidjs/router";
import type { APIEvent } from "@solidjs/start/server";
import { eq, and } from "drizzle-orm";
import { db } from "~/drizzle";
import { apiWorkflows } from "~/drizzle/schema";
import { getUser } from "~/lucia";
import { executeWorkflow, validateWorkflow, type Workflow } from "~/lib/api-workflow";

// List workflows
export async function GET({ request }: APIEvent) {
	const user = await getUser();
	if (!user) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const workflows = await db
			.select()
			.from(apiWorkflows)
			.where(eq(apiWorkflows.userId, user.id))
			.orderBy(apiWorkflows.createdAt);

		return json({ workflows });
	} catch (error: any) {
		console.error("Error fetching workflows:", error);
		return json({ error: "Failed to fetch workflows" }, { status: 500 });
	}
}

// Create or update workflow
export async function POST({ request }: APIEvent) {
	const user = await getUser();
	if (!user) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { id, name, description, steps, environmentId, execute } = body;

		// Validate workflow
		const workflow: Workflow = {
			id: id || 0,
			userId: user.id,
			name,
			description,
			steps,
			environmentId,
		};

		const errors = validateWorkflow(workflow);
		if (errors.length > 0) {
			return json({ error: "Validation failed", errors }, { status: 400 });
		}

		// If execute flag is set, execute the workflow instead of saving
		if (execute) {
			const result = await executeWorkflow(workflow);
			return json({ success: true, execution: result });
		}

		// Save workflow
		if (id) {
			// Update existing workflow
			await db
				.update(apiWorkflows)
				.set({
					name,
					description,
					steps,
					environmentId,
					updatedAt: new Date(),
				})
				.where(and(eq(apiWorkflows.id, id), eq(apiWorkflows.userId, user.id)));

			return json({ success: true, workflowId: id });
		} else {
			// Create new workflow
			const result = await db
				.insert(apiWorkflows)
				.values({
					userId: user.id,
					name,
					description,
					steps,
					environmentId,
				})
				.returning({ id: apiWorkflows.id });

			return json({ success: true, workflowId: result[0].id });
		}
	} catch (error: any) {
		console.error("Error saving workflow:", error);
		return json({ error: error.message || "Failed to save workflow" }, { status: 500 });
	}
}

// Delete workflow
export async function DELETE({ request }: APIEvent) {
	const user = await getUser();
	if (!user) {
		return json({ error: "Unauthorized" }, { status: 401 });
	}

	try {
		const url = new URL(request.url);
		const id = url.searchParams.get("id");

		if (!id) {
			return json({ error: "Missing workflow ID" }, { status: 400 });
		}

		await db
			.delete(apiWorkflows)
			.where(
				and(eq(apiWorkflows.id, parseInt(id)), eq(apiWorkflows.userId, user.id)),
			);

		return json({ success: true });
	} catch (error: any) {
		console.error("Error deleting workflow:", error);
		return json({ error: "Failed to delete workflow" }, { status: 500 });
	}
}
