import type { Pin, XY } from "@macrograph/runtime";

import type { GraphState } from "../Graph/Context";

export type SchemaMenuState =
	| { status: "closed" }
	| {
			status: "open";
			position: XY;
			graph: GraphState;
			suggestion?: {
				pin: Pin;
			};
	  };

export function createSchemaMenu(): SchemaMenuState {
	return { status: "closed" };
}
