import {
	StructBase,
	StructField,
	type StructFields,
	t,
} from "@macrograph/typesystem";
import { createMutable } from "solid-js/store";

import type { Project } from "./Project";

export class CustomStruct extends StructBase {
	id: number;
	name: string;
	project: Project;
	fields: StructFields;

	fieldIdCounter = 0;

	constructor(args: {
		id: number;
		project: Project;
		name?: string;
		fields?: Record<string, StructField & { id: number }>;
	}) {
		super();

		this.id = args.id;
		this.project = args.project;
		this.name = args?.name ?? "";
		this.fields = createMutable(args?.fields ?? {});
		this.source = { variant: "custom", id: this.id };

		this.createField();

		return createMutable(this);
	}

	createField(args?: { id?: string }) {
		const id = (args?.id ?? this.fieldIdCounter++).toString();

		this.fields[id] = new StructField(id, t.string(), "New Field");

		return id;
	}

	removeField(id: string) {
		delete this.fields[id];
	}

	editFieldType(id: string, type: t.Any) {
		const field = this.fields[id];
		if (!field) return;
		field.type = type;
	}
}
