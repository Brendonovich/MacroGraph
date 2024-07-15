import {
	deserializeType,
	StructBase,
	StructField,
	t,
} from "@macrograph/typesystem";
import { batch, createMemo } from "solid-js";
import { createMutable } from "solid-js/store";
import type { SerializedCustomStruct } from "./serialized";
import type { z } from "zod";
import type { Project } from "./Project";

export class CustomStruct extends StructBase {
	id: number;
	name: string;
	project: Project;

	_fields: Record<string, StructField & { id: number }>;

	private fieldIdCounter = 0;

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

		this.addField();

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

	private _fieldsMemo: () => Record<number, StructField & { id: number }>;

	get fields() {
		return this._fields;
		// return this._fieldsMemo();
	}

	addField() {
		const id = this.fieldIdCounter++;

		const name = `Field ${id}`;
		this._fields[id] = Object.assign(new StructField(name, t.string()), { id });

		return id;
	}

	removeField(id: number) {
		delete this._fields[id];
	}

	editFieldType(id: number, type: t.Any) {
		const field = this.fields[id];
		if (!field) return;
		field.type = type;
	}

	serialize(): z.infer<typeof SerializedCustomStruct> {
		return {
			id: this.id,
			name: this.name,
			fields: Object.values(this.fields).map((field) => ({
				name: field.name,
				id: field.id,
				type: field.type.serialize(),
			})),
			fieldIdCounter: this.fieldIdCounter,
		};
	}

	static deserialize(
		project: Project,
		data: z.infer<typeof SerializedCustomStruct>,
	) {
		const struct = new CustomStruct({
			project,
			id: data.id,
			name: data.name,
		});

		struct.fieldIdCounter = data.fieldIdCounter;

		batch(() => {
			struct._fields = data.fields.reduce((acc, serializedField) => {
				return Object.assign(acc, {
					[serializedField.id.toString()]: Object.assign(
						new StructField(
							serializedField.name,
							deserializeType(
								serializedField.type,
								project.getType.bind(project.core),
							),
						),
						{ id: serializedField.id },
					),
				});
			}, {});
		});

		return struct;
	}
}
