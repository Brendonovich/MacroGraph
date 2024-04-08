import { SerializedType } from "@macrograph/typesystem";
import { z } from "zod";
import { SerializedNode } from "./Node";

export const SerializedVariable = z.object({
	id: z.number(),
	name: z.string(),
	value: z.any(),
	type: SerializedType,
});

const SerializedField = z.object({
	id: z.number(),
	name: z.string(),
	type: SerializedType,
});

export const SerializedEvent = z.object({
	id: z.coerce.number(),
	name: z.string(),
	fields: z.array(SerializedField).default([]),
	fieldIdCounter: z.number().default(0),
});

export const SerializedConnection = z.object({
	from: z.object({
		node: z.coerce.number().int(),
		output: z.string(),
	}),
	to: z.object({
		node: z.coerce.number().int(),
		input: z.string(),
	}),
});

export const SerializedCommentBox = z.object({
	id: z.number().optional(),
	position: z.object({
		x: z.number(),
		y: z.number(),
	}),
	size: z.object({
		x: z.number(),
		y: z.number(),
	}),
	text: z.string(),
});

export const SerializedGraph = z.object({
	id: z.coerce.number(),
	name: z.string(),
	nodes: z.record(z.coerce.number().int(), SerializedNode).default({}),
	commentBoxes: z.array(SerializedCommentBox).default([]),
	variables: z.array(SerializedVariable).default([]),
	nodeIdCounter: z.number(),
	connections: z.array(SerializedConnection).default([]),
});

export const SerializedResourceItem = z
	.object({
		id: z.number(),
		name: z.string(),
	})
	.and(
		z.union([
			z.object({ value: z.string() }),
			z.object({ sourceId: z.string().nullable() }),
		]),
	);

export const SerializedResource = z.object({
	type: z.object({ pkg: z.string(), name: z.string() }),
	entry: z.object({
		default: z.number().nullable().default(null),
		items: z.array(SerializedResourceItem),
	}),
});

export const SerializedProject = z.object({
	name: z.string().optional(),
	graphs: z.array(SerializedGraph),
	graphIdCounter: z.number().int(),
	customEvents: z.array(SerializedEvent).default([]),
	customEventIdCounter: z.number().int().default(0),
	counter: z.number().default(0),
	resources: z.array(SerializedResource).default([]),
	variables: z.array(SerializedVariable).default([]),
});
