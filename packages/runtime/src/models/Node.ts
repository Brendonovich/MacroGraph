import { Maybe, None, type Option, Some } from "@macrograph/option";
import { Disposable } from "@macrograph/typesystem";
import {
	type Accessor,
	catchError,
	createEffect,
	createMemo,
	createRenderEffect,
	createRoot,
	getOwner,
	onCleanup,
	runWithOwner,
	untrack,
} from "solid-js";
import { createMutable } from "solid-js/store";

import type { XY } from "../utils";
import { ExecutionContext } from "./Core";
import { splitIORef, type Graph, type IORef } from "./Graph";
import {
	DataInput,
	type DataOutput,
	ExecInput,
	type ExecOutput,
	ScopeInput,
	type ScopeOutput,
} from "./IO";
import {
	IOBuilder,
	type NodeSchema,
	type Property,
	type inferPropertyDef,
} from "./NodeSchema";

export interface NodeArgs {
	id: number;
	name?: string;
	graph: Graph;
	schema: NodeSchema;
	position: XY;
	properties?: Record<string, string | typeof DEFAULT>;
	foldPins?: boolean;
}

export const DEFAULT = Symbol("default");
export class Node extends Disposable {
	id: number;
	graph: Graph;
	schema: NodeSchema;
	state: {
		name: string;
		position: XY;
		inputs: (DataInput<any> | ExecInput | ScopeInput)[];
		outputs: (DataOutput<any> | ExecOutput | ScopeOutput)[];
		properties: Record<string, string | number | typeof DEFAULT>;
		foldPins: boolean;
	};

	io!: IOBuilder;
	ioReturn: any;

	dataRoots!: Accessor<Set<Node>>;

	constructor(args: NodeArgs) {
		super();

		this.id = args.id;
		this.graph = args.graph;
		this.schema = args.schema;

		this.state = createMutable({
			name: args.name ? args.name : args.schema.name,
			position: args.position,
			inputs: [],
			outputs: [],
			properties: Object.values(args.schema.properties ?? {}).reduce(
				(acc, property) => {
					if ("type" in property)
						acc[property.id] =
							args.properties?.[property.id] ??
							property.default ??
							property.type.default();
					else if ("resource" in property) {
						acc[property.id] = args.properties?.[property.id] ?? DEFAULT;
					} else acc[property.id] = args.properties?.[property.id];

					return acc;
				},
				{} as Record<string, any>,
			),
			foldPins: args.foldPins ?? false,
		});

		const { owner, dispose } = createRoot((dispose) => ({
			owner: getOwner(),
			dispose,
		}));

		this.addDisposeListener(dispose);

		runWithOwner(owner, () => {
			createRenderEffect(() => {
				const io = new IOBuilder(this, this.io);

				catchError(
					() => {
						this.ioReturn = this.schema.createIO({
							io,
							properties: this.schema.properties ?? {},
							ctx: {
								getProperty: (p) => this.getProperty(p) as any,
								graph: this.graph,
							},
							graph: this.graph,
						});
					},
					(e) => console.error(e),
				);

				untrack(() => this.updateIO(io));

				this.io = io;
			});

			this.dataRoots = createMemo(() => {
				const roots = new Set<Node>();

				for (const input of this.state.inputs) {
					if (input instanceof DataInput) {
						input.connection.peek((c) => {
							for (const n of c.node.dataRoots()) {
								roots.add(n);
							}
						});
					}
				}

				return roots;
			});

			createEffect(() => {
				const mappings = this.graph.project.core.eventNodeMappings;

				if ("event" in this.schema) {
					const event = (() => {
						const eventFactory = this.schema.event;

						if (typeof eventFactory === "string") return eventFactory;

						return eventFactory({
							properties: this.schema.properties ?? {},
							ctx: {
								getProperty: (p) => this.getProperty(p) as any,
								graph: this.graph,
							},
						});
					})();

					if (event === undefined) return;

					const pkg = this.schema.package;
					if (!mappings.has(pkg)) mappings.set(pkg, new Map());
					const pkgMappings = mappings.get(pkg)!;

					if (!pkgMappings.has(event)) pkgMappings.set(event, new Set());
					pkgMappings.get(event)!.add(this);

					onCleanup(() => {
						pkgMappings.get(event)!.delete(this);
					});
				}
			});

			if ("type" in this.schema && this.schema.type === "event") {
				const s = this.schema;

				createEffect(() => {
					catchError(
						() => {
							onCleanup(
								s
									.createListener({
										properties: s.properties ?? {},
										ctx: {
											getProperty: (p) => this.getProperty(p) as any,
											graph: this.graph,
										},
									})
									.listen((data) => new ExecutionContext(this).run(data)),
							);
						},
						() => {},
						// console.error
					);
				});
			}
		});
	}

	getProperty(property: Property) {
		if ("type" in property)
			return this.state.properties[property.id] as inferPropertyDef<
				typeof property
			>;

		if ("source" in property)
			return property
				.source({ node: this })
				.find((s) => s.id === (this.state.properties[property.id] as any))
				?.id as inferPropertyDef<typeof property>;

		const { resource } = property;

		const value = this.state.properties[property.id];

		return Maybe(this.graph.project.resources.get(resource))
			.andThen((instance) =>
				Maybe(
					instance.items.find(
						(i) => i.id === (value === DEFAULT ? instance.default : value),
					),
				),
			)
			.andThen((item) => {
				if ("value" in item) return Some(item.value);
				if (!("sources" in resource)) return None;

				return Maybe(
					resource
						.sources(resource.package)
						.find((s) => s.id === item.sourceId),
				).map((s) => s.value);
			}) as inferPropertyDef<typeof property>;
	}

	updateIO(io: IOBuilder) {
		for (const w of this.io?.wildcards.values() ?? []) {
			if (!io.wildcards.has(w.id)) w.dispose();
		}

		const allInputs = new Set([...io.inputs]);
		for (const i of this.state.inputs) {
			if (allInputs.has(i)) continue;

			this.graph.disconnectPin(i);

			if ("dispose" in i) i.dispose();
		}
		this.state.inputs.splice(0, this.state.inputs.length, ...io.inputs);

		const allOutputs = new Set([...io.outputs]);
		for (const o of this.state.outputs) {
			if (allOutputs.has(o)) continue;

			this.graph.disconnectPin(o);

			if ("dispose" in o) o.dispose();
		}

		this.state.outputs.splice(0, this.state.outputs.length, ...io.outputs);
	}

	// Getters

	input(id: string) {
		return this.state.inputs.find((i) => i.id === id);
	}

	output(id: string) {
		return this.state.outputs.find((o) => o.id === id);
	}

	// Setters

	setProperty(property: string, value: any) {
		this.state.properties[property] = value;
	}

	ancestor(): Option<Node> {
		for (const input of this.state.inputs) {
			if (input instanceof ExecInput) {
				for (const conn of input.connections) {
					const anc = conn.node.ancestor();

					if (anc.isSome()) return anc;
					return Some(conn.node);
				}
			}
			if (input instanceof ScopeInput) {
				if (input.connection.isSome()) {
					const anc = input.connection.unwrap().node.ancestor();

					if (anc.isSome()) return anc;
					return Some(input.connection.unwrap().node);
				}
			}
		}

		return None;
	}
}
