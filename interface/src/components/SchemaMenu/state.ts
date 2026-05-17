import type { Pin, XY } from "@macrograph/runtime";

import type { GraphViewState } from "../Graph/Context";

export type SchemaMenuState =
	| { status: "closed" }
	| {
			status: "open";
			position: XY;
			graph: GraphViewState;
			suggestion?: { pin: Pin };
	  };

export function createSchemaMenu(): SchemaMenuState {
	return { status: "closed" };
}
