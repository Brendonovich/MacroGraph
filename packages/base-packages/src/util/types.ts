import { Schema } from "effect";

export class TickEvent extends Schema.TaggedClass<TickEvent>()("TickEvent", {
	tick: Schema.Int,
}) {}
