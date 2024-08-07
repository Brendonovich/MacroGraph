import { type PrimitiveType, t } from "@macrograph/typesystem";
import { createMutable } from "solid-js/store";

import type { Project } from "./Project";

type CustomEventField = {
  id: number;
  name: string;
  type: t.Any;
};

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

  fields: Array<CustomEventField> = [];

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

  createField() {
    const id = this.generateId();
    this.fields.push({
      id,
      name: `Field ${id}`,
      type: t.string(),
    });
  }

  editFieldName(id: number, name: string) {
    const pin = this.fields.find((f) => f.id === id);
    if (!pin) return;
    pin.name = name;
  }

  editFieldType(id: number, type: PrimitiveType) {
    const pin = this.fields.find((f) => f.id === id);
    if (!pin) return;
    pin.type = type;
  }

  deleteField(id: number) {
    const index = this.fields.findIndex((f) => f.id === id);
    if (index === -1) return;
    this.fields.splice(index, 1);
  }
}
