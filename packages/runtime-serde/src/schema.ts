import * as v from "valibot";

const IntID = v.pipe(
	v.union([v.number(), v.string()]),
	v.transform(Number),
	v.integer(),
);

export const XY = v.object({
	x: v.number(),
	y: v.number(),
});

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

type FieldType =
	| v.InferOutput<typeof TypeBases>
	| { variant: "option"; inner: FieldType }
	| { variant: "list"; item: FieldType }
	| { variant: "map"; value: FieldType };

export const Type: v.BaseSchema<FieldType, any, any> = v.union([
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

export const CustomEventField = v.object({
	id: v.number(),
	name: v.string(),
	type: Type,
});

export const CustomEvent = v.object({
	id: IntID,
	name: v.string(),
	fields: v.optional(v.array(CustomEventField), []),
	fieldIdCounter: v.optional(v.number(), 0),
});

export const CustomStructField = v.object({
	id: v.string(),
	name: v.optional(v.string()),
	type: Type,
});

export const CustomStruct = v.object({
	id: IntID,
	name: v.optional(v.string()),
	fields: v.optional(v.array(CustomStructField), []),
	fieldIdCounter: v.optional(v.number(), 0),
});

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

export const CommentBox = v.object({
	id: v.optional(v.number()),
	position: XY,
	size: XY,
	text: v.string(),
	tint: v.optional(v.string()),
});

export const Node = v.object({
	id: v.number(),
	name: v.string(),
	position: v.object({
		x: v.number(),
		y: v.number(),
	}),
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

export const Graph = v.object({
	id: IntID,
	name: v.string(),
	nodes: v.record(v.pipe(v.string(), v.transform(Number)), Node),
	commentBoxes: v.optional(v.array(CommentBox), []),
	variables: v.optional(v.array(Variable), []),
	nodeIdCounter: v.number(),
	connections: v.optional(v.array(Connection), []),
});

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

export const Resource = v.object({
	type: v.object({ pkg: v.string(), name: v.string() }),
	entry: v.object({
		default: v.optional(v.nullable(v.number()), null),
		items: v.array(ResourceItem),
	}),
});

export const Project = v.object({
	name: v.optional(v.string()),
	graphs: v.array(Graph),
	graphIdCounter: v.pipe(v.number(), v.integer()),
	customEvents: v.optional(v.array(CustomEvent), []),
	customEventIdCounter: v.optional(v.pipe(v.number(), v.integer()), 0),
	customTypeIdCounter: v.optional(v.pipe(v.number(), v.integer()), 0),
	customStructs: v.optional(v.array(CustomStruct), []),
	counter: v.optional(v.number(), 0),
	resources: v.optional(v.array(Resource), []),
	variables: v.optional(v.array(Variable), []),
});
