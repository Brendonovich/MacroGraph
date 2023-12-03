import { createMutable } from "solid-js/store";
import { z } from "zod";
import { batch } from "solid-js";

import { Project } from "./Project";
import { t, PrimitiveType } from "../types";

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

const SerializedFieldTypeBases = z.union([
  z.literal("int"),
  z.literal("float"),
  z.literal("string"),
  z.literal("bool"),
  // z.tuple([
  //   z.literal("struct"),
  //   z.string(), // name
  //   Source,
  // ]),
  // z.tuple([
  //   z.literal("enum"),
  //   z.string(), // name
  //   Source,
  // ]),
]);

type SerializedFieldType =
  | z.infer<typeof SerializedFieldTypeBases>
  | { variant: "option"; inner: SerializedFieldType }
  | { variant: "list"; item: SerializedFieldType }
  | { variant: "map"; value: SerializedFieldType };

const SerializedFieldType: z.ZodType<SerializedFieldType> =
  SerializedFieldTypeBases.or(
    z.discriminatedUnion("variant", [
      z.object({
        variant: z.literal("option"),
        inner: z.lazy(() => SerializedFieldType),
      }),
      z.object({
        variant: z.literal("list"),
        item: z.lazy(() => SerializedFieldType),
      }),
      z.object({
        variant: z.literal("map"),
        value: z.lazy(() => SerializedFieldType),
      }),
    ])
  );

const SerializedField = z.object({
  id: z.number(),
  name: z.string(),
  type: SerializedFieldType,
});

export const SerializedEvent = z.object({
  id: z.coerce.number(),
  name: z.string(),
  fields: z.array(SerializedField).default([]),
  fieldIdCounter: z.number().default(0),
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
        type: field.type.serialize(),
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
        function deserializeType(
          type: z.infer<typeof SerializedFieldType>
        ): t.Any {
          switch (type) {
            case "string":
              return t.string();
            case "float":
              return t.float();
            case "int":
              return t.int();
            case "bool":
              return t.bool();
          }

          // if (Array.isArray(type)) {
          //   const source = type[2];

          //   switch (type[0]) {
          //     case "struct": {
          //       let struct: Struct | undefined;

          //       switch (source.variant) {
          //         case "package": {
          //           const pkg = project.core.packages.find(
          //             (p) => p.name === source.package
          //           );

          //           if (!pkg)
          //             throw new Error(`Package ${source.package} not found!`);

          //           struct = pkg.structs.get(type[1]);
          //         }
          //       }

          //       if (!struct) throw new Error(`Struct ${type[1]} not found!`);

          //       return t.struct(struct);
          //     }
          //     case "enum": {
          //       let e: Enum | undefined;

          //       switch (source.variant) {
          //         case "package": {
          //           const pkg = project.core.packages.find(
          //             (p) => p.name === source.package
          //           );

          //           if (!pkg)
          //             throw new Error(`Package ${source.package} not found!`);

          //           e = pkg.enums.get(type[1]);
          //         }
          //       }

          //       if (!e) throw new Error(`Struct ${type[1]} not found!`);

          //       return t.enum(e);
          //     }
          //   }
          // } else
          switch (type.variant) {
            case "option":
              return t.option(deserializeType(type.inner));
            case "list":
              return t.list(deserializeType(type.item));
            case "map":
              return t.map(deserializeType(type.value));
          }
        }

        return {
          id: serializedField.id,
          name: serializedField.name,
          type: deserializeType(serializedField.type),
        };
      });
    });

    return event;
  }
}
