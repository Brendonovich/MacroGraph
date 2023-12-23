import { z } from "zod";
import { t } from ".";

const SerializedTypeBases = z.union([
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
  | z.infer<typeof SerializedTypeBases>
  | { variant: "option"; inner: SerializedFieldType }
  | { variant: "list"; item: SerializedFieldType }
  | { variant: "map"; value: SerializedFieldType };

export const SerializedType: z.ZodType<SerializedFieldType> =
  SerializedTypeBases.or(
    z.discriminatedUnion("variant", [
      z.object({
        variant: z.literal("option"),
        inner: z.lazy(() => SerializedType),
      }),
      z.object({
        variant: z.literal("list"),
        item: z.lazy(() => SerializedType),
      }),
      z.object({
        variant: z.literal("map"),
        value: z.lazy(() => SerializedType),
      }),
    ])
  );

export function deserializeType(type: z.infer<typeof SerializedType>): t.Any {
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
