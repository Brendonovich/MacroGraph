/**
 * API Workflow Execution Service
 * Chains multiple API calls with variable extraction and conditional execution
 */

import type { ApiRequestConfig, ApiResponse } from "./api-client";
import {
	makeApiRequest,
	extractJsonValue,
	evaluateCondition,
} from "./api-client";
import { logApiCall } from "./api-logger";

export interface WorkflowStep {
	id: string;
	name: string;
	method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
	url: string;
	headers?: Record<string, string>;
	authType: "none" | "bearer" | "basic" | "api_key" | "oauth2";
	authConfig?: {
		token?: string;
		username?: string;
		password?: string;
		apiKey?: string;
		apiKeyHeader?: string;
		accessToken?: string;
	};
	body?: any;
	// Extract variables from response to use in subsequent steps
	extractVariables?: Record<string, string>; // key: variable name, value: JSONPath
	// Conditional execution
	condition?: {
		field: string; // JSONPath to field in previous response
		operator: "eq" | "neq" | "gt" | "lt" | "contains";
		value: any;
	};
	// If condition fails, skip this step
	skipOnConditionFail?: boolean;
}

export interface Workflow {
	id: number;
	userId: string;
	name: string;
	description?: string;
	steps: WorkflowStep[];
	environmentId?: number;
}

export interface WorkflowExecutionResult {
	workflowId: number;
	userId: string;
	success: boolean;
	startTime: Date;
	endTime: Date;
	duration: number; // milliseconds
	steps: Array<{
		stepId: string;
		name: string;
		skipped: boolean;
		success: boolean;
		request?: ApiRequestConfig;
		response?: ApiResponse;
		error?: string;
		extractedVariables?: Record<string, any>;
	}>;
	extractedVariables: Record<string, any>;
}

/**
 * Execute a workflow with multiple API call steps
 */
export async function executeWorkflow(
	workflow: Workflow,
	initialVariables: Record<string, string> = {},
	logToFiles: boolean = true,
): Promise<WorkflowExecutionResult> {
	const startTime = new Date();
	const result: WorkflowExecutionResult = {
		workflowId: workflow.id,
		userId: workflow.userId,
		success: true,
		startTime,
		endTime: new Date(),
		duration: 0,
		steps: [],
		extractedVariables: { ...initialVariables },
	};

	// Track previous response for conditions
	let previousResponse: ApiResponse | null = null;

	for (const step of workflow.steps) {
		const stepResult: (typeof result.steps)[0] = {
			stepId: step.id,
			name: step.name,
			skipped: false,
			success: false,
		};

		try {
			// Check condition if specified
			if (step.condition && previousResponse) {
				const conditionMet = evaluateCondition(
					previousResponse.data,
					step.condition,
				);

				if (!conditionMet) {
					if (step.skipOnConditionFail) {
						stepResult.skipped = true;
						stepResult.success = true;
						result.steps.push(stepResult);
						continue;
					} else {
						throw new Error(
							`Condition not met: ${step.condition.field} ${step.condition.operator} ${step.condition.value}`,
						);
					}
				}
			}

			// Build request config
			const requestConfig: ApiRequestConfig = {
				method: step.method,
				url: step.url,
				headers: step.headers,
				auth: step.authConfig
					? {
							type: step.authType,
							...step.authConfig,
						}
					: undefined,
				body: step.body,
				variables: result.extractedVariables,
			};

			stepResult.request = requestConfig;

			// Make the API request
			const response = await makeApiRequest(requestConfig);
			stepResult.response = response;
			stepResult.success = true;
			previousResponse = response;

			// Extract variables from response
			if (step.extractVariables) {
				const extracted: Record<string, any> = {};
				for (const [varName, jsonPath] of Object.entries(
					step.extractVariables,
				)) {
					const value = extractJsonValue(response.data, jsonPath);
					extracted[varName] = value;
					result.extractedVariables[varName] = String(value);
				}
				stepResult.extractedVariables = extracted;
			}

			// Log the API call if enabled
			if (logToFiles) {
				await logApiCall({
					userId: workflow.userId,
					workflowId: workflow.id,
					name: `${workflow.name} - ${step.name}`,
					request: requestConfig,
					response,
					timestamp: new Date(),
				});
			}
		} catch (error: any) {
			stepResult.success = false;
			stepResult.error = error.message || "Unknown error";
			result.success = false;

			// Log the failed API call
			if (logToFiles) {
				await logApiCall({
					userId: workflow.userId,
					workflowId: workflow.id,
					name: `${workflow.name} - ${step.name}`,
					request: stepResult.request!,
					error: {
						message: stepResult.error,
						status: error.status,
						response: error.response,
					},
					timestamp: new Date(),
				});
			}

			// Stop execution on error
			result.steps.push(stepResult);
			break;
		}

		result.steps.push(stepResult);
	}

	const endTime = new Date();
	result.endTime = endTime;
	result.duration = endTime.getTime() - startTime.getTime();

	return result;
}

/**
 * Validate a workflow structure
 */
export function validateWorkflow(workflow: Workflow): string[] {
	const errors: string[] = [];

	if (!workflow.name || workflow.name.trim() === "") {
		errors.push("Workflow name is required");
	}

	if (!workflow.steps || workflow.steps.length === 0) {
		errors.push("Workflow must have at least one step");
	}

	// Validate each step
	workflow.steps.forEach((step, index) => {
		const stepPrefix = `Step ${index + 1} (${step.name || "unnamed"})`;

		if (!step.id || step.id.trim() === "") {
			errors.push(`${stepPrefix}: Step ID is required`);
		}

		if (!step.method) {
			errors.push(`${stepPrefix}: HTTP method is required`);
		}

		if (!step.url || step.url.trim() === "") {
			errors.push(`${stepPrefix}: URL is required`);
		}

		// Validate auth config if auth type is not none
		if (step.authType && step.authType !== "none") {
			if (!step.authConfig) {
				errors.push(`${stepPrefix}: Auth config is required for ${step.authType} auth`);
			} else {
				switch (step.authType) {
					case "bearer":
						if (!step.authConfig.token) {
							errors.push(`${stepPrefix}: Bearer token is required`);
						}
						break;
					case "basic":
						if (!step.authConfig.username || !step.authConfig.password) {
							errors.push(
								`${stepPrefix}: Username and password are required for basic auth`,
							);
						}
						break;
					case "api_key":
						if (!step.authConfig.apiKey) {
							errors.push(`${stepPrefix}: API key is required`);
						}
						break;
					case "oauth2":
						if (!step.authConfig.accessToken) {
							errors.push(`${stepPrefix}: Access token is required for OAuth2`);
						}
						break;
				}
			}
		}
	});

	return errors;
}

/**
 * Create a simple workflow from a single API call config
 */
export function createSimpleWorkflow(
	userId: string,
	name: string,
	request: ApiRequestConfig,
): Workflow {
	return {
		id: 0, // Will be set when saved to database
		userId,
		name,
		steps: [
			{
				id: "step-1",
				name: name,
				method: request.method,
				url: request.url,
				headers: request.headers,
				authType: request.auth?.type || "none",
				authConfig: request.auth,
				body: request.body,
			},
		],
	};
}
