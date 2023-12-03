import { createMutable } from "solid-js/store";
import { z } from "zod";
import { batch } from "solid-js";

import { Project } from "./Project";
import { PrimitiveType, t } from "../types";

type CustomEventField = {
  id: number;
  name: string;
  type: PrimitiveType;
};

export interface EventArgs {
  id: number;
  name: string;
  project: Project;
}

const SerializedField = z.object({
  id: z.number(),
  name: z.string(),
  type: z.union([
    z.literal("float"),
    z.literal("int"),
    z.literal("string"),
    z.literal("bool"),
  ]),
});

export const SerializedEvent = z.object({
  id: z.coerce.number(),
  name: z.string(),
  fields: z.array(SerializedField).default([]),
  fieldIdCounter: z.number(),
});

export class CustomEvent {
  id: number;
  name: string;
  project: Project;

  fields: Array<CustomEventField> = [];

  private fieldIdCounter = 0;

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
      name: `Pin ${id}`,
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
    this.project.save();
  }

  deletePin(id: number) {
    const index = this.fields.findIndex((f) => f.id === id);
    if (index === -1) return;
    this.fields.splice(index, 1);
  }

  serialize(): z.infer<typeof SerializedEvent> {
    return {
      id: this.id,
      name: this.name,
      fields: this.fields.map((field) => ({
        ...field,
        type: field.type.primitiveVariant(),
      })),
      fieldIdCounter: this.fieldIdCounter,
    };
  }

  static deserialize(project: Project, data: z.infer<typeof SerializedEvent>) {
    const event = new CustomEvent({
      project,
      id: data.id,
      name: data.name,
    });

    event.fieldIdCounter = data.fieldIdCounter;

    batch(() => {
      event.fields = data.fields.map((serializedField) => {
        return {
          id: serializedField.id,
          name: serializedField.name,
          type: (() => {
            switch (serializedField.type) {
              case "string":
                return t.string();
              case "float":
                return t.float();
              case "int":
                return t.int();
              case "bool":
                return t.bool();
            }
          })(),
        };
      });
    });

    return event;
  }
}
