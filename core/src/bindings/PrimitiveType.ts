import { Primitive } from "./Primitive";

export type PrimitiveType = "int" | "float" | "string" | "bool";

export const defaultPrimitiveType = (typ: PrimitiveType): Primitive => {
  switch (typ) {
    case "int":
      return {
        type: "int",
        value: 0,
      };
    case "float":
      return {
        type: "float",
        value: 0,
      };
    case "bool":
      return {
        type: "bool",
        value: false,
      };
    case "string":
      return {
        type: "string",
        value: "",
      };
  }
};
