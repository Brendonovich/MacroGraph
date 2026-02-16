import { Effect } from "effect";

import { EngineDef } from "./index";
import { TickEvent } from "./types";

export default EngineDef.toLayer((ctx) =>
	Effect.gen(function* () {
		let i = 0;
		setInterval(() => {
			ctx.emitEvent(new TickEvent({ tick: i++ }));
		}, 1000);

		return {
			clientState: Effect.never,
			resources: {},
			clientRpcs: {},
			runtimeRpcs: {},
		};
	}),
);
