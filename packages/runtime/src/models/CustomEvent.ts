import { Field, type PrimitiveType, t } from "@macrograph/typesystem";
import { createMutable } from "solid-js/store";

import type { Project } from "./Project";

export interface EventArgs {
  id: number;
  name: string;
  project: Project;
}

// const Source = z.discriminatedUnion("variant", [
//   z.object({ variant: z.literal("package"), package: z.string() }),
//   z.object({ variant: z.literal("custom") }),
// ]);

export class CustomEvent {
  id: number;
  name: string;
  project: Project;

  fields: Array<Field> = [];

  fieldIdCounter = 0;

  constructor(args: EventArgs) {
    this.id = args.id;
    this.name = args.name;
    this.project = args.project;

    this.createField();
    return createMutable(this);
  }

  generateId() {
    return this.fieldIdCounter++;
  }

  createField(args?: { id?: string }) {
    const id = args?.id ?? this.generateId().toString();
    this.fields.push(new Field(id, t.string(), "New Field"));
  }

  field(id: string) {
    return this.fields.find((f) => f.id === id.toString());
  }

  editFieldName(id: string, name?: string) {
    const pin = this.fields.find((f) => f.id === id.toString());
    if (!pin) return;
    pin.name = name;
  }

  editFieldType(id: string, type: PrimitiveType) {
    const pin = this.fields.find((f) => f.id === id.toString());
    if (!pin) return;
    pin.type = type;
  }

  deleteField(id: string) {
    const index = this.fields.findIndex((f) => f.id === id.toString());
    if (index === -1) return;
    this.fields.splice(index, 1);
  }
}
