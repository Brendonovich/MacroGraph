import { Option, PubSub, type Ref, type Scope, Stream } from "effect";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import type { Package as SDKPackage } from "@macrograph/package-sdk";
import {
	Actor,
	type IO,
	type Package,
	type Project,
	type ProjectEvent,
} from "@macrograph/project-domain";

import type { EngineHost } from "./EngineHost";

export interface NodeIO {
	readonly shape: unknown;
	readonly inputs: Array<IO.InputPort>;
	readonly outputs: Array<IO.OutputPort>;
}

export class CurrentProject extends Context.Tag("CurrentProject")<
	CurrentProject,
	Project.Project
>() {}

export interface ProjectRuntime_ {
	package: (id: Package.Id) => Effect.Effect<Option.Option<SDKPackage.Any>>;
	packages: Effect.Effect<Iterable<[Package.Id, SDKPackage.Any]>>;
	loadPackage: (id: Package.Id, pkg: SDKPackage.Any) => Effect.Effect<void>;

	engines: Map<string, EngineHost.EngineHost>;

	publishEvent: <Event extends ProjectEvent.RuntimeEvent>(
		event: Event,
	) => Effect.Effect<Event, never, Actor.Current>;
	subscribe: Effect.Effect<
		Stream.Stream<ProjectEvent.RuntimeEvent & { actor: Actor.Actor }>,
		never,
		Scope.Scope
	>;
}

const tag = Context.GenericTag<ProjectRuntime_>("ProjectRuntime_");
export const ProjectRuntime_ = tag;

export const make = () =>
	Effect.gen(function* () {
		const packages = new Map<Package.Id, SDKPackage.Any>();
		const engines = new Map<string, EngineHost.EngineHost>();

		const events = yield* PubSub.unbounded<
			ProjectEvent.RuntimeEvent & { actor: Actor.Actor }
		>();

		const editor = {
			package: (id) => Effect.sync(() => Option.fromNullable(packages.get(id))),
			packages: Effect.sync(() => packages.entries()),
			loadPackage: (id, pkg) =>
				Effect.sync(() => {
					packages.set(id, pkg);
				}),
			engines,

			publishEvent: (e) =>
				Effect.gen(function* () {
					yield* events.offer({ ...e, actor: yield* Actor.Current });
					return e;
				}),
			subscribe: Stream.fromPubSub(events, { scoped: true }),
		} as ProjectRuntime_;

		return editor;
	});
