/**
 * API Response Logger Service
 * Logs API responses to both database and markdown files
 */

import { eq } from "drizzle-orm";
import { db } from "../drizzle";
import { apiCallLogs } from "../drizzle/schema";
import type { ApiRequestConfig, ApiResponse, ApiError } from "./api-client";
import { mkdir, writeFile, appendFile } from "node:fs/promises";
import { join } from "node:path";

export interface LogEntry {
	userId: string;
	workflowId?: number;
	name?: string;
	request: ApiRequestConfig;
	response?: ApiResponse;
	error?: ApiError;
	timestamp: Date;
}

/**
 * Log API call to database
 */
export async function logToDatabase(entry: LogEntry): Promise<number> {
	const result = await db
		.insert(apiCallLogs)
		.values({
			userId: entry.userId,
			workflowId: entry.workflowId,
			name: entry.name,
			method: entry.request.method,
			url: entry.request.url,
			headers: entry.request.headers,
			authType: entry.request.auth?.type || "none",
			authConfig: entry.request.auth
				? {
						type: entry.request.auth.type,
						// Don't store sensitive data in full, just metadata
						hasToken: !!entry.request.auth.token,
						hasUsername: !!entry.request.auth.username,
						hasApiKey: !!entry.request.auth.apiKey,
						apiKeyHeader: entry.request.auth.apiKeyHeader,
					}
				: undefined,
			requestBody: entry.request.body,
			responseStatus: entry.response?.status,
			responseHeaders: entry.response?.headers,
			responseBody: entry.response?.data,
			responseTime: entry.response?.responseTime,
			error: entry.error?.message,
			timestamp: entry.timestamp,
			environmentId: undefined, // Will be set when we implement environments
		})
		.returning({ id: apiCallLogs.id });

	return result[0].id;
}

/**
 * Get API call logs from database
 */
export async function getLogsFromDatabase(
	userId: string,
	limit: number = 100,
) {
	return await db
		.select()
		.from(apiCallLogs)
		.where(eq(apiCallLogs.userId, userId))
		.orderBy(apiCallLogs.timestamp)
		.limit(limit);
}

/**
 * Get a single API call log by ID
 */
export async function getLogById(userId: string, logId: number) {
	const results = await db
		.select()
		.from(apiCallLogs)
		.where(eq(apiCallLogs.id, logId))
		.where(eq(apiCallLogs.userId, userId))
		.limit(1);

	return results[0] || null;
}

/**
 * Format response as markdown
 */
export function formatAsMarkdown(entry: LogEntry): string {
	const lines: string[] = [];

	lines.push(`# API Call Log`);
	lines.push(``);
	lines.push(`**Timestamp:** ${entry.timestamp.toISOString()}`);
	lines.push(`**Name:** ${entry.name || "Unnamed Request"}`);
	if (entry.workflowId) {
		lines.push(`**Workflow ID:** ${entry.workflowId}`);
	}
	lines.push(``);

	// Request section
	lines.push(`## Request`);
	lines.push(``);
	lines.push(`**Method:** ${entry.request.method}`);
	lines.push(`**URL:** ${entry.request.url}`);
	lines.push(``);

	// Auth info (without sensitive data)
	if (entry.request.auth && entry.request.auth.type !== "none") {
		lines.push(`**Authentication:** ${entry.request.auth.type}`);
		lines.push(``);
	}

	// Headers
	if (entry.request.headers && Object.keys(entry.request.headers).length > 0) {
		lines.push(`**Headers:**`);
		lines.push(`\`\`\`json`);
		lines.push(JSON.stringify(entry.request.headers, null, 2));
		lines.push(`\`\`\``);
		lines.push(``);
	}

	// Request body
	if (entry.request.body) {
		lines.push(`**Request Body:**`);
		lines.push(`\`\`\`json`);
		lines.push(JSON.stringify(entry.request.body, null, 2));
		lines.push(`\`\`\``);
		lines.push(``);
	}

	// Response section
	if (entry.response) {
		lines.push(`## Response`);
		lines.push(``);
		lines.push(`**Status:** ${entry.response.status} ${entry.response.statusText}`);
		lines.push(`**Response Time:** ${entry.response.responseTime.toFixed(2)}ms`);
		lines.push(``);

		// Response headers
		if (
			entry.response.headers &&
			Object.keys(entry.response.headers).length > 0
		) {
			lines.push(`**Response Headers:**`);
			lines.push(`\`\`\`json`);
			lines.push(JSON.stringify(entry.response.headers, null, 2));
			lines.push(`\`\`\``);
			lines.push(``);
		}

		// Response body
		lines.push(`**Response Body:**`);
		lines.push(`\`\`\`json`);
		lines.push(JSON.stringify(entry.response.data, null, 2));
		lines.push(`\`\`\``);
		lines.push(``);
	}

	// Error section
	if (entry.error) {
		lines.push(`## Error`);
		lines.push(``);
		lines.push(`**Message:** ${entry.error.message}`);
		if (entry.error.status) {
			lines.push(`**Status:** ${entry.error.status}`);
		}
		if (entry.error.response) {
			lines.push(`\`\`\`json`);
			lines.push(JSON.stringify(entry.error.response, null, 2));
			lines.push(`\`\`\``);
		}
		lines.push(``);
	}

	lines.push(`---`);
	lines.push(``);

	return lines.join("\n");
}

/**
 * Get markdown log directory path
 */
export function getLogDirectory(): string {
	// Store logs in a directory at the project root
	return join(process.cwd(), "api-logs");
}

/**
 * Get markdown log file path for a specific date
 */
export function getLogFilePath(date: Date): string {
	const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD
	return join(getLogDirectory(), `${dateStr}.md`);
}

/**
 * Log API call to markdown file
 */
export async function logToMarkdown(entry: LogEntry): Promise<string> {
	const logDir = getLogDirectory();
	const logFile = getLogFilePath(entry.timestamp);

	// Ensure log directory exists
	try {
		await mkdir(logDir, { recursive: true });
	} catch (error) {
		// Directory might already exist, ignore error
	}

	const markdown = formatAsMarkdown(entry);

	// Append to daily log file
	try {
		await appendFile(logFile, markdown, "utf-8");
	} catch (error) {
		// If file doesn't exist, create it
		await writeFile(logFile, markdown, "utf-8");
	}

	return logFile;
}

/**
 * Log API call to both database and markdown
 */
export async function logApiCall(
	entry: LogEntry,
): Promise<{ dbId: number; mdFile: string }> {
	const [dbId, mdFile] = await Promise.all([
		logToDatabase(entry),
		logToMarkdown(entry),
	]);

	return { dbId, mdFile };
}
