import { createMutable } from "solid-js/store";
import { z } from "zod";
import { type TypeVariant, type Wildcard, t } from ".";
import { BaseType } from "./base";

export class StructField<Type extends t.Any = t.Any> {
  constructor(public id: string, public type: Type, public name?: string) {
    return createMutable(this);
  }

  default(): any {
    return this.type.default();
  }
}

export type StructFields = Record<string, StructField>;

export class LazyStructFields<Fields extends StructFields = StructFields> {
  constructor(public build: () => Fields) {}
}

export abstract class StructBase {
  source!:
    | { variant: "package"; package: string }
    | { variant: "custom"; id: number };
  abstract name: string;
  abstract fields: StructFields;
}

export class Struct<
  Fields extends StructFields = StructFields
> extends StructBase {
  constructor(public name: string, fields: Fields | LazyStructFields<Fields>) {
    super();

    if (fields instanceof LazyStructFields) {
      this._fields = {
        type: "lazy",
        fields,
      };
    } else {
      for (const [id, field] of Object.entries(fields)) {
        field.name = field.id;
        field.id = id;
      }
      this._fields = {
        type: "resolved",
        fields,
      };
    }
  }

  _fields:
    | { type: "resolved"; fields: Fields }
    | { type: "lazy"; fields: LazyStructFields<Fields> };

  get fields() {
    let val = this._fields;

    if (val.type === "lazy") {
      const fields = val.fields.build();
      for (const [id, field] of Object.entries(fields)) {
        field.name = field.id;
        field.id = id;
      }
      this._fields = val = {
        type: "resolved",
        fields,
      };
    }

    return val.fields;
  }

  create(data: InferStruct<this>): InferStruct<this> {
    return data;
  }

  static refSchema = z.union([
    z.object({ source: z.literal("project"), id: z.number() }),
    z.object({
      source: z.literal("package"),
      package: z.string(),
      name: z.string(),
    }),
  ]);
}

export class StructBuilder {
  field<Type extends t.Any>(id: string, type: Type) {
    return new StructField(id, type);
  }

  lazy<T extends StructFields>(fn: () => T) {
    return new LazyStructFields(fn);
  }
}

export class StructType<TStruct extends StructBase> extends BaseType<
  InferStruct<TStruct>
> {
  constructor(public struct: TStruct) {
    super();
  }

  default(): InferStruct<TStruct> {
    return Object.entries(this.struct.fields).reduce(
      (acc, [key, value]) => Object.assign(acc, { [key]: value.default() }),
      {}
    ) as any;
  }

  variant(): TypeVariant {
    return "struct";
  }

  toString(): string {
    return `Struct(${this.struct.name})`;
  }

  // asZodType(): z.ZodType<InferStruct<TStruct>> {
  //   return z.object(
  //     Object.entries(this.struct.fields).reduce(
  //       (acc, [key, value]) => ({
  //         ...acc,
  //         [key]: value.type.asZodType(),
  //       }),
  //       {}
  //     )
  //   ) as any;
  // }

  getWildcards(): Wildcard[] {
    return Object.values(this.struct.fields).flatMap((f) =>
      f.type.getWildcards()
    );
  }

  eq(other: t.Any): boolean {
    return other instanceof t.Struct && other.struct === this.struct;
  }

  serialize() {
    return {
      variant: "struct",
      struct: { ...this.struct.source, name: this.struct.name },
    };
  }

  deserialize() {
    return this;
  }

  hasUnconnectedWildcard(): boolean {
    return false;
  }
}

export type InferStruct<S> = S extends Struct<infer Fields>
  ? InferStructFields<Fields>
  : never;

export type InferStructFields<F> = F extends StructFields
  ? { [K in keyof F]: InferStructField<F[K]> }
  : never;

export type InferStructField<F> = F extends StructField<infer Type>
  ? Type extends BaseType<infer TOut>
    ? TOut
    : never
  : never;
