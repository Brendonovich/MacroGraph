import * as v from "valibot";

const IntID = v.pipe(
	v.union([v.number(), v.string()]),
	v.transform(Number),
	v.integer(),
);

export const XY = v.pipe(
	v.union([
		v.object({ x: v.number(), y: v.number() }),
		v.tuple([v.number(), v.number()]),
	]),
	v.transform((v) => {
		if (Array.isArray(v)) return { x: v[0], y: v[1] };
		return v;
	}),
);

const TypeBases = v.union([
	v.literal("int"),
	v.literal("float"),
	v.literal("string"),
	v.literal("bool"),
	v.object({
		variant: v.literal("struct"),
		struct: v.variant("variant", [
			v.object({
				variant: v.literal("package"),
				package: v.string(),
				name: v.string(),
			}),
			v.object({ variant: v.literal("custom"), id: v.number() }),
		]),
	}),
	v.object({
		variant: v.literal("enum"),
		enum: v.variant("variant", [
			v.object({
				variant: v.literal("package"),
				package: v.string(),
				name: v.string(),
			}),
			v.object({ variant: v.literal("custom"), id: v.number() }),
		]),
	}),
]);

export type Type =
	| v.InferOutput<typeof TypeBases>
	| { variant: "option"; inner: Type }
	| { variant: "list"; item: Type }
	| { variant: "map"; value: Type };

export const Type: v.BaseSchema<Type, any, any> = v.union([
	TypeBases,
	v.object({
		variant: v.literal("option"),
		inner: v.lazy(() => Type),
	}),
	v.object({
		variant: v.literal("list"),
		item: v.lazy(() => Type),
	}),
	v.object({
		variant: v.literal("map"),
		value: v.lazy(() => Type),
	}),
]);

export const Variable = v.object({
	id: v.number(),
	name: v.string(),
	value: v.any(),
	type: Type,
});
export type Variable = v.InferOutput<typeof Variable>;

export const Field = v.object({
	id: v.pipe(v.union([v.string(), v.number()]), v.transform(String)),
	name: v.optional(v.string()),
	type: Type,
});
export type Field = v.InferOutput<typeof Field>;

export const CustomEventField = v.object({
	id: v.number(),
	name: v.string(),
	type: Type,
});
export type CustomEventField = v.InferOutput<typeof CustomEventField>;

export const CustomEvent = v.object({
	id: IntID,
	name: v.string(),
	fields: v.optional(v.array(Field), []),
	fieldIdCounter: v.optional(v.number(), 0),
});
export type CustomEvent = v.InferOutput<typeof CustomEvent>;

export const CustomStructField = v.object({
	id: v.string(),
	name: v.optional(v.string()),
	type: Type,
});
export type CustomStructField = v.InferOutput<typeof CustomStructField>;

export const CustomStruct = v.object({
	id: IntID,
	name: v.optional(v.string()),
	fields: v.optional(v.array(CustomStructField), []),
	fieldIdCounter: v.optional(v.number(), 0),
});
export type CustomStruct = v.InferOutput<typeof CustomStruct>;

export const CustomEnumVariantField = v.object({
	id: v.string(),
	name: v.optional(v.string()),
	type: Type,
});
export type CustomEnumVariantField = v.InferOutput<
	typeof CustomEnumVariantField
>;

export const CustomEnumVariant = v.object({
	id: v.string(),
	display: v.optional(v.string()),
	fields: v.optional(v.array(Field), []),
	fieldIdCounter: v.optional(v.number(), 0),
});
export type CustomEnumVariant = v.InferOutput<typeof CustomEnumVariant>;

export const CustomEnum = v.object({
	id: IntID,
	name: v.optional(v.string()),
	variants: v.optional(v.array(CustomEnumVariant), []),
	variantIdCounter: v.optional(v.number(), 0),
});
export type CustomEnum = v.InferOutput<typeof CustomEnum>;

export const Connection = v.object({
	from: v.object({
		node: IntID,
		output: v.string(),
	}),
	to: v.object({
		node: IntID,
		input: v.string(),
	}),
});
export type Connection = v.InferOutput<typeof Connection>;

export const CommentBox = v.object({
	id: v.number(),
	position: XY,
	size: XY,
	text: v.string(),
	tint: v.optional(v.string()),
});
export type CommentBox = v.InferOutput<typeof CommentBox>;

export const Node = v.object({
	id: v.number(),
	name: v.string(),
	position: XY,
	schema: v.object({
		package: v.string(),
		id: v.string(),
	}),
	defaultValues: v.record(v.string(), v.any()),
	properties: v.optional(
		v.record(
			v.string(),
			v.union([v.string(), v.number(), v.object({ default: v.literal(true) })]),
		),
		{},
	),
	foldPins: v.optional(v.boolean(), false),
});
export type Node = v.InferOutput<typeof Node>;

export const Graph = v.object({
	id: IntID,
	name: v.string(),
	nodes: v.record(v.pipe(v.string(), v.transform(Number)), Node),
	commentBoxes: v.optional(v.array(CommentBox), []),
	variables: v.optional(v.array(Variable), []),
	nodeIdCounter: v.number(),
	connections: v.optional(v.array(Connection), []),
});
export type Graph = v.InferOutput<typeof Graph>;

export const ResourceItem = v.intersect([
	v.object({
		id: v.number(),
		name: v.string(),
	}),
	v.union([
		v.object({ value: v.string() }),
		v.object({ sourceId: v.nullable(v.string()) }),
	]),
]);
export type ResourceItem = v.InferOutput<typeof ResourceItem>;

export const Resource = v.object({
	type: v.object({ pkg: v.string(), name: v.string() }),
	entry: v.object({
		default: v.optional(v.nullable(v.number()), null),
		items: v.array(ResourceItem),
	}),
});
export type Resource = v.InferOutput<typeof Resource>;

export const Project = v.object({
	name: v.optional(v.string()),
	graphs: v.array(Graph),
	graphIdCounter: v.pipe(v.number(), v.integer()),
	customEvents: v.optional(v.array(CustomEvent), []),
	customEventIdCounter: v.optional(v.pipe(v.number(), v.integer()), 0),
	customTypeIdCounter: v.optional(v.pipe(v.number(), v.integer()), 0),
	customStructs: v.optional(v.array(CustomStruct), []),
	customEnums: v.optional(v.array(CustomEnum), []),
	counter: v.optional(v.number(), 0),
	resources: v.optional(v.array(Resource), []),
	variables: v.optional(v.array(Variable), []),
});
export type Project = v.InferOutput<typeof Project>;

export const ProjectRoot = v.object({
	name: v.optional(v.string()),
	graphs: v.array(IntID),
	graphIdCounter: v.pipe(v.number(), v.integer()),
	customEvents: v.optional(v.array(CustomEvent), []),
	customEventIdCounter: v.optional(v.pipe(v.number(), v.integer()), 0),
	customTypeIdCounter: v.optional(v.pipe(v.number(), v.integer()), 0),
	customStructs: v.optional(v.array(CustomStruct), []),
	customEnums: v.optional(v.array(CustomEnum), []),
	counter: v.optional(v.number(), 0),
	resources: v.optional(v.array(Resource), []),
	variables: v.optional(v.array(Variable), []),
});
export type ProjectRoot = v.InferOutput<typeof ProjectRoot>;
