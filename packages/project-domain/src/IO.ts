import { Effect, Iterable, Option } from "effect";
import * as S from "effect/Schema";
import {
	DataInput,
	DataOutput,
	ExecInput,
	ExecOutput,
	type Schema,
} from "@macrograph/package-sdk";
import * as T from "@macrograph/typesystem";

import * as Node from "./Node";

export const Id = S.String.pipe(S.brand("IO/Id"));
export type Id = typeof Id.Type;

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

export class Exec extends S.TaggedClass<Exec>()("Exec", {}) {}
export class Data extends S.TaggedClass<Data>()("Data", {
	type: T.AnySchema_,
}) {}

export const Variant = S.Union(Exec, Data);
export type Variant = typeof Variant.Type;

export const InputPort = S.Struct({
	id: Id,
	name: S.optional(S.String),
	variant: Variant,
});
export type InputPort = typeof InputPort.Type;

export const OutputPort = S.Struct({
	id: Id,
	name: S.optional(S.String),
	variant: Variant,
});
export type OutputPort = typeof OutputPort.Type;

export const NodeIO = S.Struct({
	inputs: S.Array(InputPort),
	outputs: S.Array(OutputPort),
});
export type NodeIO = typeof NodeIO.Type;

export const PortRef = S.Tuple(Node.Id, S.Literal("In", "Out"), Id);
export type PortRef = typeof PortRef.Type;

export class PortConections extends S.Class<PortConections>("PortConections")({
	from: PortRef,
	to: S.Array(PortRef),
}) {}

export const generateNodeIO = Effect.fnUntraced(function* (
	schema: Schema.Any,
	node: Node.Node,
) {
	const io = {
		inputs: [] as Array<InputPort>,
		outputs: [] as Array<OutputPort>,
	};

	const shape = schema.io({
		out: {
			exec: (_id, options) => {
				const id = Id.make(_id);
				io.outputs.push({ id, name: options?.name, variant: new Exec() });
				return new ExecOutput({ id });
			},
			data: (_id, type, options) => {
				const id = Id.make(_id);
				io.outputs.push({
					id,
					name: options?.name,
					variant: new Data({ type: T.serialize(type) }),
				});
				return new DataOutput({ id, type });
			},
		},
		in: {
			exec: (_id, options) => {
				const id = Id.make(_id);
				io.inputs.push({ id, name: options?.name, variant: new Exec() });
				return new ExecInput({ id });
			},
			data: (_id, type, options) => {
				const id = Id.make(_id);
				io.inputs.push({
					id,
					name: options?.name,
					variant: new Data({ type: T.serialize(type) }),
				});
				return new DataInput({ id, type });
			},
		},
		properties:
			node.properties?.pipe(
				Iterable.filterMap(([key, value]) => {
					const def = schema.properties?.[key];
					if (!def || !("type" in def)) return Option.none();
					return Option.some([key, value ?? T.default_(def.type)] as const);
				}),
				Object.fromEntries,
			) ?? ({} as any),
	});

	return { ...io, shape };
});
