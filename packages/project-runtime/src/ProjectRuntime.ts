import type { Option } from "effect";
import * as Context from "effect/Context";
import type * as Effect from "effect/Effect";
import type { Package as SDKPackage } from "@macrograph/package-sdk";
import type { IO, Package, Project } from "@macrograph/project-domain";

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
}

const tag = Context.GenericTag<ProjectRuntime_>("ProjectRuntime_");

export const ProjectRuntime_ = tag;
