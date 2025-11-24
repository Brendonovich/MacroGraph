import * as S from "effect/Schema";

import * as Node from "./Node";

export const Id = S.String.pipe(S.brand("IO.Id"));
export type Id = S.Schema.Type<typeof Id>;

export type RefString = `${Node.Id}:${"i" | "o"}:${Id}`;

export function parseRef(ioRef: RefString) {
	const [nodeId, type, ...id] = ioRef.split(":");
	return {
		nodeId: Node.Id.make(Number(nodeId)),
		type: type as "i" | "o",
		id: Id.make(id.join("")),
	};
}

export class NotFound extends S.TaggedError<NotFound>()("IO.NotFound", {
	id: Id,
}) {}

export namespace DataType {
	export const Int = S.Literal("Int");
	export type Int = S.Schema.Type<typeof Int>;

	export const Float = S.Literal("Float");
	export type Float = S.Schema.Type<typeof Float>;

	export const String = S.Literal("String");
	export type String = S.Schema.Type<typeof String>;

	export const Bool = S.Literal("Bool");
	export type Bool = S.Schema.Type<typeof Bool>;

	export const Primitive = S.Union(Int, Float, String, Bool);
	export type Primitive = S.Schema.Type<typeof Primitive>;

	export const MapKey = S.Union(Int, Float, String);
	export type MapKey = S.Schema.Type<typeof MapKey>;

	export type Any =
		| Primitive
		| readonly ["List", Any]
		| readonly ["Map", MapKey, Any]
		| readonly ["Option", Any];
	export const AnyConcrete: S.Schema<Any> = S.suspend(() =>
		S.Union(
			Primitive,
			S.Tuple(S.Literal("List"), AnyConcrete),
			S.Tuple(S.Literal("Map"), MapKey, AnyConcrete),
			S.Tuple(S.Literal("Option"), AnyConcrete),
		),
	);
}

export class Exec extends S.TaggedClass<Exec>()("Exec", {}) {}
export class Data extends S.TaggedClass<Data>()("Data", {
	type: DataType.AnyConcrete,
}) {}

export const Variant = S.Union(Exec, Data);
export type Variant = S.Schema.Type<typeof Variant>;

export const InputPort = S.Struct({
	id: Id,
	name: S.optional(S.String),
	variant: Variant,
});
export type InputPort = S.Schema.Type<typeof InputPort>;

export const OutputPort = S.Struct({
	id: Id,
	name: S.optional(S.String),
	variant: Variant,
});
export type OutputPort = S.Schema.Type<typeof OutputPort>;

export const NodeIO = S.Struct({
	shape: S.Unknown,
	inputs: S.Array(InputPort),
	outputs: S.Array(OutputPort),
});
export type NodeIO = S.Schema.Type<typeof NodeIO>;

export const PortRef = S.Tuple(Node.Id, S.Literal("In", "Out"), Id);
export type PortRef = S.Schema.Type<typeof PortRef>;

export class PortConections extends S.Class<PortConections>("PortConections")({
	from: PortRef,
	to: S.Array(PortRef),
}) {}
