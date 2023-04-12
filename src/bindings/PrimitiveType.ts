export type PrimitiveType = "int" | "float" | "string" | "bool";

export const defaultPrimitiveType = (typ: PrimitiveType) => {
  switch (typ) {
    case "int":
    case "float":
      return 0;
    case "bool":
      return false;
    case "string":
      return "";
  }
};
