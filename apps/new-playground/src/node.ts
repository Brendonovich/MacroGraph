import { Brand } from "effect";

export type NodeId = number & Brand.Brand<"NodeId">;

export type Node = {
  id: NodeId;
  schema: {
    pkgId: string;
    schemaId: string;
  };
  io: any;
};
