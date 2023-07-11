export type WebsocketResponse = {
  id: number;
  data: DaemonResponse;
};

type DaemonResponse =
  | "Ok"
  | { Error: string }
  | { Status: DaemonStatus }
  | { Patch: Patch };

type DaemonStatus = {
  mixers: Record<string, MixerStatus>;
};

type MixerStatus = {
  levels: Levels;
};

type Levels = {
  volumes: Record<string, number>;
};

type Op<K extends string, T extends object = {}> = {
  op: K;
  path: string;
} & T;

type PatchOperation =
  | Op<"Add", { value: any }>
  | Op<"Remove">
  | Op<"Replace", { value: any }>
  | Op<"Move", { from: string }>
  | Op<"Copy", { from: string }>
  | Op<"Test", { value: any }>;

export type Patch = Array<PatchOperation>;
