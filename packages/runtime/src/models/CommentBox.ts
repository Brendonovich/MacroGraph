import { createMutable } from "solid-js/store";

import type { XY } from "../utils";
import type { Graph } from "./Graph";

export interface CommentBoxArgs {
	id: number;
	graph: Graph;
	position: XY;
	size: XY;
	text: string;
	tint?: string;
}

export class CommentBox {
	id: number;
	graph: Graph;
	position: XY;
	size: XY;
	text: string;
	tint: string;

	constructor(args: CommentBoxArgs) {
		this.id = args.id;
		this.graph = args.graph;
		this.position = args.position;
		this.size = args.size;
		this.text = args.text;
		this.tint = args.tint ?? "#FFF";

		return createMutable(this);
	}
}
