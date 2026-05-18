import type { contract, CREDENTIAL } from "@macrograph/api-contract";
import { Maybe, Some, type Option } from "@macrograph/option";
import { deserializeValue } from "@macrograph/typesystem";
import type { InitClientReturn } from "@ts-rest/core";
import { createMutable } from "solid-js/store";
import * as v from "valibot";

import { implicitConversions } from "../utils";
import {
	DataInput,
	DataOutput,
	ScopeInput,
	ScopeOutput,
} from "./IO";
import type { Node } from "./Node";
import type { EventsMap, RunCtx } from "./NodeSchema";
import type { Package } from "./Package";
import { Project } from "./Project";
import type { Variable } from "./Variable";
import { z } from "zod";

import { getRemoteShellMode, setRemoteShellMode } from "../remoteShell";

class NodeEmit {
	listeners = new Map<Node, Set<(d: Node) => any>>();
	anyListeners = new Set<(node: Node) => void>();

	emit(node: Node) {
		for (const listener of this.listeners.get(node) ?? []) {
			listener(node);
		}
		for (const cb of this.anyListeners) {
			cb(node);
		}
	}

	subscribe(node: Node, cb: (d: Node) => any) {
		if (!this.listeners.has(node)) this.listeners.set(node, new Set());
		const listeners = this.listeners.get(node)!;

		listeners?.add(cb);

		return () => {
			listeners?.delete(cb);
			if (listeners?.size === 0) this.listeners.delete(node);
		};
	}

	onAny(cb: (node: Node) => void) {
		this.anyListeners.add(cb);
		return () => this.anyListeners.delete(cb);
	}
}

export const NODE_EMIT = new NodeEmit();

export type OAuthToken = {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	scope: string[];
	issued_at: number;
};

export const OAUTH_TOKEN = v.object({
	access_token: v.string(),
	refresh_token: v.string(),
	expires_in: v.number(),
	scope: v.optional(v.array(v.string()), []),
	issued_at: v.number(),
});

export type RefreshedOAuthToken = Omit<OAuthToken, "refresh_token">;

type OAuth = {
	authorize(provider: string): Promise<OAuthToken>;
	refresh(
		provider: string,
		refreshToken: string,
	): Promise<OAuthToken | RefreshedOAuthToken>;
};

export class Core {
	project: Project = new Project({
		core: this,
	});

	packages = [] as Package[];

	eventNodeMappings = new Map<Package, Map<string, Set<Node>>>();

	fetch: typeof fetch;
	oauth: OAuth;
	api: InitClientReturn<typeof contract, any>;

	/** True when running the remote web editor shell (no integration sockets). */
	remoteShell = false;

	/**
	 * Sanitized credential rows mirrored from the desktop host (no real tokens).
	 * When set, {@link getCredentials} / {@link getCredential} serve these instead of the API.
	 */
	private hostMirrorCredentialStubs?: Array<z.infer<typeof CREDENTIAL>>;

	private credentials?: Array<z.infer<typeof CREDENTIAL>>;

	private fetchCredentials = async () => {
		const creds = await this.api.getCredentials();
		if (creds.status !== 200) throw new Error("Failed to get credentials");
		this.credentials = creds.body;
		return creds.body;
	};

	getCredentials = async () => {
		if (this.remoteShell) {
			return this.hostMirrorCredentialStubs ?? [];
		}
		if (this.credentials) return this.credentials;

		return await this.fetchCredentials();
	};

	getCredential = (provider: string, id: string | number) =>
		this.getCredentials().then(async (creds) => {
			const cred = creds.find(
				(c) => c.provider === provider && c.id === String(id),
			);
			if (!cred) return null;
			if (this.remoteShell) return cred;

			if (
				cred.token.issuedAt + cred.token.expires_in * 1000 >
				Date.now() - 1000 * 60 * 60 * 5
			)
				return cred;

			return await this.refreshCredential(provider, cred.id);
		});
	refreshCredential = async (provider: string, id: string) => {
		if (this.remoteShell) {
			throw new Error(
				"Remote editor cannot refresh OAuth tokens; reconnect from the host app.",
			);
		}
		const resp = await this.api.refreshCredential({
			params: { providerId: provider, providerUserId: id },
		});

		if (resp.status !== 200)
			throw new Error(`Failed to refresh credential ${provider}:${id}`);

		await this.fetchCredentials();

		return resp.body;
	};

	constructor(args?: {
		fetch?: typeof fetch;
		oauth?: OAuth;
		api?: InitClientReturn<typeof contract, any>;
		/** Remote web editor: load packages for UI but do not connect to integrations. */
		remoteShell?: boolean;
	}) {
		this.fetch = args?.fetch ?? fetch;
		this.oauth = args?.oauth!;
		this.api = args?.api!;
		this.remoteShell = args?.remoteShell ?? false;

		setRemoteShellMode(this.remoteShell);

		return createMutable(this);
	}

	/** Apply sanitized credential rows from the host (remote shell only). */
	setRemoteHostMirrorCredentialSummaries(
		rows: Array<{ provider: string; id: string; displayName: string | null }>,
	) {
		if (!this.remoteShell) return;

		const now = Date.now();
		this.hostMirrorCredentialStubs = rows.map((r) => ({
			provider: r.provider,
			id: r.id,
			displayName: r.displayName,
			token: {
				access_token: "",
				refresh_token: "",
				expires_in: 86_400 * 365,
				token_type: "bearer",
				issuedAt: now,
			},
		}));
	}

	// async bc of #402, the project's reactivity needs to be entirely decoupled from the ui
	async load(getProject: (core: Core) => Promise<Project>) {
		await new Promise<void>((res) => {
			this.eventNodeMappings.clear();
			getProject(this).then((project) => {
				this.project = project;
				this.project.disableSave = true;

				res();
			});
		});
		this.project.disableSave = false;
	}

	schema(pkg: string, name: string) {
		return this.packages.find((p) => p.name === pkg)?.schema(name);
	}

	registerPackage(packageFactory: (core: this) => Package<any>) {
		const pkg = packageFactory(this);
		pkg.core = this;
		this.packages.push(pkg);
	}

	emitEvent<TEvents extends EventsMap, TEvent extends keyof EventsMap>(
		pkg: Package<TEvents, any>,
		event: { name: TEvent; data: TEvents[TEvent] },
	) {
		const mappings = this.eventNodeMappings
			.get(pkg as any)
			?.get(event.name as string);

		for (const n of mappings ?? []) {
			new ExecutionContext(n).run(event.data);
		}
	}

	private printListeners = new Set<(msg: PrintItem) => void>();

	invocationReporter?: (report: NodeInvocationReport) => void;

	print(msg: string, node: Node) {
		this.consoleLog("log", msg, node);
	}

	warn(msg: string, node: Node) {
		this.consoleLog("warn", msg, node);
	}

	error(msg: string, node: Node) {
		this.consoleLog("error", msg, node);
	}

	private consoleLog(type: PrintType, msg: string, node: Node) {
		for (const cb of this.printListeners) {
			cb({
				type,
				value: msg,
				timestamp: new Date(),
				graph: {
					name: node.graph.name,
					id: node.graph.id,
					kind: node.graph.kind,
				},
				node: { name: node.state.name, id: node.id },
			});
		}
	}

	printSubscribe(cb: (i: PrintItem) => void) {
		this.printListeners.add(cb);
		return () => this.printListeners.delete(cb);
	}
}

export type PrintType = "log" | "warn" | "error";

export interface PrintItem {
	type: PrintType;
	value: string;
	timestamp: Date;
	graph: { name: string; id: number; kind: import("./Project").GraphKind };
	node: { name: string; id: number };
}

export type NodeInvocationReport = {
	graphKind: import("./Project").GraphKind;
	graphId: number;
	graphName: string;
	nodeId: number;
	nodeName: string;
	ok: boolean;
	startedAt: number;
	durationMs: number;
	eventData?: unknown;
	inputs: Record<string, unknown>;
	outputs: Record<string, unknown>;
	error?: { message: string; stack?: string };
};

export class ExecutionContext {
	data = new Map<DataOutput<any> | ScopeOutput, any>();
	variableScope: Map<string, any> | null = null;

	private replayInputByPinId?: Record<string, unknown>;
	private replaySnapshotNodeId?: number;

	constructor(public root: Node) {}

	run(data: any) {
		void this.runAsync(data).catch((e) => {
			console.error(e);
		});
	}

	async runAsync(
		data: any,
		replaySnapshotInputs?: Record<string, unknown>,
	) {
		if (getRemoteShellMode()) return;
		await this.runWithInvocationReporting(data, replaySnapshotInputs);
	}

	private async runWithInvocationReporting(
		data: any,
		replaySnapshotInputs?: Record<string, unknown>,
	) {
		const node = this.root;
		NODE_EMIT.emit(node);

		const replaySnap = replaySnapshotInputs;
		const prevPins = this.replayInputByPinId;
		const prevId = this.replaySnapshotNodeId;
		if (replaySnap) {
			this.replayInputByPinId = replaySnap;
			this.replaySnapshotNodeId = node.id;
		}

		const startedAt = Date.now();
		const t0 = performance.now();
		let ok = true;
		let err: unknown;

		try {
			await Promise.resolve(
				node.schema.run({
					ctx: this.createCtx(node),
					io: node.ioReturn,
					data,
					properties: node.schema.properties ?? {},
					graph: node.graph,
				}),
			);
		} catch (e) {
			ok = false;
			err = e;
			throw e;
		} finally {
			this.emitInvocationReport(node, {
				startedAt,
				durationMs: performance.now() - t0,
				ok,
				error: err,
				eventData: data,
			});
			if (replaySnap) {
				this.replayInputByPinId = prevPins;
				this.replaySnapshotNodeId = prevId;
			}
		}
	}

	createCtx(node: Node): RunCtx {
		const execCtx = this;
		return {
			exec: async (execOutput) => {
				await execOutput
					.connection()
					.peekAsync((conn) => this.execNode(conn.node));
			},
			execScope: async (scopeOutput, data) => {
				await scopeOutput.connection().peekAsync(async (conn) => {
					this.data.set(scopeOutput, data);

					await this.execNode(conn.node);
				});
			},
			setOutput: (output, value) => {
				this.data.set(output, value);
			},
			getInput: (input) => {
				if (
					this.replaySnapshotNodeId === node.id &&
					this.replayInputByPinId &&
					(input instanceof DataInput || input instanceof ScopeInput) &&
					Object.prototype.hasOwnProperty.call(
						this.replayInputByPinId,
						input.id,
					)
				) {
					const snap = this.replayInputByPinId[input.id];
					if (!isInvocationUnreadMarker(snap)) {
						if (input instanceof DataInput) {
							return deserializeValue(snap, input.type) as never;
						}
						return snap as never;
					}
				}

				return (
					input.connection as Option<DataOutput<any> | ScopeOutput>
				).mapOrElse(
					() => {
						if (input instanceof DataInput)
							return input.defaultValue ?? input.type.default();
					},
					(conn) => {
						const data = this.data.get(conn);

						if (data === undefined)
							throw new Error(`Data not found for input '${input.id}'!`);

						if (input instanceof DataInput)
							return applyImplicitConversion(data, input);

						return data;
					},
				);
			},
			getProperty: (p) => node.getProperty(p) as any,
			getVariable(source, id) {
				const scopeKey = `${source}:${id}`;
				if (execCtx.variableScope?.has(scopeKey)) {
					return Some({ value: execCtx.variableScope.get(scopeKey) } as any);
				}
				if (source === "graph") {
					return Maybe(node.graph.variables.find((v) => v.id === id));
				}
				return Maybe(
					node.graph.core.project.variables.find((v) => v.id === id),
				);
			},
			setVariable: (source, id, value) => {
				const scopeKey = `${source}:${id}`;
				if (execCtx.variableScope) {
					execCtx.variableScope.set(scopeKey, value);
					return;
				}
				let variable: Variable | undefined;
				if (source === "graph") {
					variable = node.graph.variables.find((v) => v.id === id);
				} else {
					variable = node.graph.core.project.variables.find((v) => v.id === id);
				}
				if (!variable) return;
				variable.value = value;
			},
		};
	}

	async execNode(
		node: Node,
		options?: { replaySnapshotInputs?: Record<string, unknown> },
	) {
		if (getRemoteShellMode()) return;
		if (
			"event" in node.schema ||
			("type" in node.schema && node.schema.type === "event")
		)
			throw new Error("Cannot exec an Event node!");

		NODE_EMIT.emit(node);

		const replaySnap = options?.replaySnapshotInputs;
		const prevPins = this.replayInputByPinId;
		const prevId = this.replaySnapshotNodeId;
		if (replaySnap) {
			this.replayInputByPinId = replaySnap;
			this.replaySnapshotNodeId = node.id;
		}

		try {
			if (!replaySnap) {
				// calculate previous outputs
				await Promise.allSettled(
					node.state.inputs.map((i) => {
						if (!(i instanceof DataInput)) return;

						i.connection.peekAsync(async (conn) => {
							const connectedNode = conn.node;
							const schema = connectedNode.schema;

							if (
								("variant" in schema && schema.variant === "Pure") ||
								("type" in schema && schema.type === "pure")
							) {
								// Pure nodes recalculate each time

								await this.execNode(connectedNode as any);
							} else {
								// Value should already be present for non-pure nodes

								const value = this.data.get(conn);

								if (value === undefined)
									throw new Error(
										`Data for Pin ${conn.id}, Node ${conn.node.state.name} not found!`,
									);
							}
						});
					}),
				);
			}

			const startedAt = Date.now();
			const t0 = performance.now();
			let ok = true;
			let err: unknown;

			try {
				await Promise.resolve(
					node.schema.run({
						ctx: this.createCtx(node),
						io: node.ioReturn,
						properties: node.schema.properties ?? {},
						graph: node.graph,
					}),
				);
			} catch (e) {
				ok = false;
				err = e;
				throw e;
			} finally {
				this.emitInvocationReport(node, {
					startedAt,
					durationMs: performance.now() - t0,
					ok,
					error: err,
				});
			}
		} finally {
			if (replaySnap) {
				this.replayInputByPinId = prevPins;
				this.replaySnapshotNodeId = prevId;
			}
		}
	}

	private emitInvocationReport(
		node: Node,
		args: {
			startedAt: number;
			durationMs: number;
			ok: boolean;
			error?: unknown;
			eventData?: unknown;
		},
	) {
		if (!args.ok && args.error !== undefined) {
			const err = args.error;
			const msg = err instanceof Error ? err.message : String(err);
			node.graph.project.core.error(`${node.state.name}: ${msg}`, node);
		}

		const reporter = node.graph.project.core.invocationReporter;
		if (!reporter) return;

		try {
			const ctx = this.createCtx(node);
			const inputs = snapshotInvocationInputs(ctx, node);
			const outputs = snapshotInvocationOutputs(this, node);

			let error: NodeInvocationReport["error"];
			if (!args.ok && args.error !== undefined) {
				const err = args.error;
				error =
					err instanceof Error
						? {
								message: err.message,
								stack: err.stack ?? "",
							}
						: { message: String(err) };
			}

			reporter({
				graphKind: node.graph.kind,
				graphId: node.graph.id,
				graphName: node.graph.name,
				nodeId: node.id,
				nodeName: node.state.name,
				ok: args.ok,
				startedAt: args.startedAt,
				durationMs: args.durationMs,
				eventData: args.eventData,
				inputs,
				outputs,
				error,
			});
		} catch (e) {
			console.error("invocationReporter failed", e);
		}
	}
}

function isInvocationUnreadMarker(v: unknown): boolean {
	return (
		typeof v === "object" &&
		v !== null &&
		"__unread" in v &&
		(v as { __unread?: unknown }).__unread === true
	);
}

/**
 * Re-run a node from a persisted invocation. For the target node only,
 * `getInput` uses the snapshot (no live wire / pure prelude). Event nodes use
 * stored `eventData` plus snapshot pin inputs. Downstream `exec` / `execScope`
 * behave normally.
 */
export async function rerunNodeFromInvocationSnapshot(
	node: Node,
	snapshot: { inputs: Record<string, unknown>; eventData?: unknown },
) {
	if (getRemoteShellMode()) return;
	const isEvent =
		"event" in node.schema ||
		("type" in node.schema && node.schema.type === "event");

	const ctx = new ExecutionContext(node);

	if (isEvent) {
		await ctx.runAsync(snapshot.eventData ?? {}, snapshot.inputs);
		return;
	}

	await ctx.execNode(node, { replaySnapshotInputs: snapshot.inputs });
}

function snapshotInvocationInputs(ctx: RunCtx, node: Node) {
	const inputs: Record<string, unknown> = {};

	for (const pin of node.state.inputs) {
		if (pin instanceof DataInput || pin instanceof ScopeInput) {
			try {
				inputs[pin.id] = ctx.getInput(pin as never);
			} catch (e) {
				inputs[pin.id] = {
					__unread: true,
					error: e instanceof Error ? e.message : String(e),
				};
			}
		}
	}

	return inputs;
}

function snapshotInvocationOutputs(ctx: ExecutionContext, node: Node) {
	const outputs: Record<string, unknown> = {};

	for (const pin of node.state.outputs) {
		if (pin instanceof DataOutput || pin instanceof ScopeOutput) {
			if (ctx.data.has(pin)) outputs[pin.id] = ctx.data.get(pin);
		}
	}

	return outputs;
}

function applyImplicitConversion(value: any, input: DataInput<any>) {
	const output = input.connection.toNullable();
	if (!output) return value;

	for (const conversion of Object.values(implicitConversions)) {
		if (conversion.check(output.type, input.type))
			return conversion.apply(value);
	}

	return value;
}
