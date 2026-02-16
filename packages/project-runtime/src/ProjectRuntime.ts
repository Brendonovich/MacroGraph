import type { Scope } from "effect";
import { Context, Effect, Option, PubSub, Stream } from "effect";
import type {
	Package as SDKPackage,
	Schema as SDKSchema,
} from "@macrograph/package-sdk";
import {
	type Actor,
	type IO,
	Package,
	type Project,
	type ProjectEvent,
	Schema,
} from "@macrograph/project-domain";

import type { EngineInstanceClient } from "./EngineInstance";
import { fireEventNode } from "./NodeExecution";

export interface NodeIO {
	readonly shape: unknown;
	readonly inputs: ReadonlyArray<IO.InputPort>;
	readonly outputs: ReadonlyArray<IO.OutputPort>;
}

export namespace ProjectRuntime {
	export interface ProjectRuntime {
		package: (
			id: Package.Id,
		) => Effect.Effect<SDKPackage.Any, Package.NotFound>;
		schema: (
			ref: Schema.Ref,
		) => Effect.Effect<SDKSchema.Any, Package.NotFound | Schema.NotFound>;
		loadPackage: (id: Package.Id, pkg: SDKPackage.Any) => Effect.Effect<void>;

		publishEvent: <Event extends ProjectEvent.RuntimeEvent>(
			event: Event,
		) => Effect.Effect<Event>;
		/** Runtime events; always emitted as SYSTEM actor. */
		subscribe: Effect.Effect<
			Stream.Stream<ProjectEvent.RuntimeEvent & { actor: Actor.Actor }>,
			never,
			Scope.Scope
		>;
	}

	const tag = Context.GenericTag<ProjectRuntime>(
		"@macrograph/project-runtime/ProjectRuntime",
	);
	export const ProjectRuntime = tag;

	export class CurrentProject extends Context.Tag(
		"@macrograph/project-runtime/CurrentProject",
	)<CurrentProject, Project.Project>() {}

	export const make = () =>
		Effect.gen(function* () {
			const packages = new Map<Package.Id, SDKPackage.Any>();
			const events = yield* PubSub.unbounded<
				ProjectEvent.RuntimeEvent & { actor: Actor.Actor }
			>();

			const publishEvent = <Event extends ProjectEvent.RuntimeEvent>(
				event: Event,
			) =>
				Effect.gen(function* () {
					yield* events.offer({ ...event, actor: { type: "SYSTEM" } });
					return event;
				});

			const pkgLookup = (id: Package.Id) =>
				Option.fromNullable(packages.get(id)).pipe(
					Effect.catchTag(
						"NoSuchElementException",
						() => new Package.NotFound({ id }),
					),
				);
			const schemaLookup = (ref: Schema.Ref) =>
				pkgLookup(ref.pkg).pipe(
					Effect.flatMap((pkg) =>
						Option.fromNullable(pkg.schemas.get(ref.id)).pipe(
							Effect.catchTag(
								"NoSuchElementException",
								() => new Schema.NotFound(ref),
							),
						),
					),
				);

			const runtime: ProjectRuntime = {
				package: pkgLookup,
				schema: schemaLookup,
				loadPackage: (id, pkg) =>
					Effect.gen(function* () {
						packages.set(id, pkg);
					}),
				publishEvent,
				subscribe: Stream.fromPubSub(events, { scoped: true }),
			};

			return runtime;
		});

	export const handleEvent = (pkg: Package.Id, event: unknown) =>
		Effect.gen(function* () {
			const runtime = yield* ProjectRuntime;
			const project = yield* CurrentProject;

			const tasks = [];

			for (const [graphId, graph] of project.graphs) {
				for (const [nodeId, node] of graph.nodes) {
					if (node.schema.pkg !== pkg) continue;

					const s = yield* runtime.schema(node.schema).pipe(Effect.option);

					if (Option.isSome(s) && s.value.type === "event") {
						yield* Effect.log(`Firing event node ${graphId}:${nodeId}`);
						tasks.push(
							yield* fireEventNode(project, graphId, nodeId, event).pipe(
								Effect.fork,
							),
						);
					}
				}
			}

			return tasks;
		});
}
