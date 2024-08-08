import { StructBase, StructField, t } from "@macrograph/typesystem";
import { createMemo } from "solid-js";
import { createMutable } from "solid-js/store";

import type { Project } from "./Project";

export class CustomStruct extends StructBase {
	id: number;
	name: string;
	project: Project;

	_fields: Record<string, StructField>;

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
		this._fields = createMutable(args?.fields ?? {});
		this.source = { variant: "custom", id: this.id };

		this.createField();

		const self = createMutable(this);

		this._fieldsMemo = createMemo(() => {
			return Object.values(self._fields).reduce(
				(acc, field) =>
					Object.assign(acc, {
						[field.id]: field,
					}),
				{} as Record<number, StructField & { id: number }>,
			);
		});

		return self;
	}

	private _fieldsMemo: () => Record<number, StructField>;

	get fields() {
		return this._fields;
		// return this._fieldsMemo();
	}

	createField(args?: { id?: number }) {
		const id = args?.id ?? this.fieldIdCounter++;

		const name = `Field ${id}`;
		this._fields[id] = new StructField(id.toString(), t.string(), name);

		return id;
	}

	removeField(id: string) {
		delete this._fields[id];
	}

	editFieldType(id: string, type: t.Any) {
		const field = this.fields[id];
		if (!field) return;
		field.type = type;
	}
}
