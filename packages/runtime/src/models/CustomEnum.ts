import {
	EnumBase,
	EnumVariant,
	type EnumVariantFields,
	Field,
	t,
} from "@macrograph/typesystem";
import { createMutable } from "solid-js/store";

import type { Project } from "./Project";

export type CustomEnumVariants = [
	one: CustomEnumVariant<string, EnumVariantFields>,
	...variant: CustomEnumVariant<string, EnumVariantFields>[],
];

export class CustomEnum extends EnumBase {
	id: number;
	name: string;
	project: Project;
	variants: CustomEnumVariants;

	variantIdCounter = 0;

	constructor(args: {
		id: number;
		project: Project;
		name?: string;
		variants?: CustomEnumVariants;
	}) {
		super();

		this.id = args.id;
		this.project = args.project;
		this.name = args?.name ?? "";
		this.variants = createMutable(
			args?.variants ?? [new CustomEnumVariant("New Variant", {})],
		);
		this.source = { variant: "custom", id: this.id };

		return createMutable(this);
	}

	variant(id: string) {
		return this.variants.find((variant) => variant.id === id);
	}

	createVariant(args?: { id?: string }) {
		const id = (args?.id ?? this.variantIdCounter++).toString();

		this.variants.push(new CustomEnumVariant(id, {}, "New Variant"));

		return id;
	}

	removeVariant(id: string) {
		const index = this.variants.findIndex((variant) => variant.id === id);
		if (index === -1) return;

		this.variants.splice(index, 1);
	}
}
export class CustomEnumVariant<
	Id extends string,
	Fields extends EnumVariantFields,
> extends EnumVariant<Id, Fields> {
	field(id: string) {
		return this.fields[id];
	}

	createField(args?: { id?: string }) {
		const id = (args?.id ?? this.fieldIdCounter++).toString();

		if (this.fields)
			(this.fields[id] as any) = new Field(id, t.string(), "New Field");

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
