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
  | Op<"add", { value: any }>
  | Op<"remove">
  | Op<"replace", { value: any }>
  | Op<"move", { from: string }>
  | Op<"copy", { from: string }>
  | Op<"test", { value: any }>;

export type Patch = Array<PatchOperation>;
