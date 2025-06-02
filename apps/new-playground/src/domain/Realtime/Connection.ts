import { Context, Schema } from "effect";

export const RealtimeConnectionId = Schema.Number.pipe(
  Schema.brand("Realtime Client ID"),
);
export type RealtimeConnectionId = (typeof RealtimeConnectionId)["Type"];

export class RealtimeConnection extends Context.Tag("RealtimeConnection")<
  RealtimeConnection,
  { id: RealtimeConnectionId }
>() {}
