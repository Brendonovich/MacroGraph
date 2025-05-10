import {
	Field,
	StructBase,
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
	fieldOrder: Array<string> = [];

	fieldIdCounter = 0;

	constructor(args: {
		id: number;
		project: Project;
		name?: string;
		fields?: Record<string, Field>;
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

		this.fields[id] = new Field(id, t.string(), "New Field");
		this.fieldOrder.push(id);

		return id;
	}

	removeField(id: string) {
		delete this.fields[id];
		this.fieldOrder.splice(this.fieldOrder.indexOf(id), 1);
	}

	editFieldType(id: string, type: t.Any) {
		const field = this.fields[id];
		if (!field) return;
		field.type = type;
	}
}
