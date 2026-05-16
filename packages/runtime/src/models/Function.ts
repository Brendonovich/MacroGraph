import { type AnyType, Field, t } from "@macrograph/typesystem";
import { createMutable } from "solid-js/store";

import type { Project } from "./Project";

export interface FunctionArgs {
	id: number;
	name: string;
	graphId: number;
	project: Project;
}

export class GraphFunction {
	id: number;
	name: string;
	graphId: number;
	project: Project;

	inputs: Field[] = [];
	outputs: Field[] = [];
	inputIdCounter = 0;
	outputIdCounter = 0;

	constructor(args: FunctionArgs) {
		this.id = args.id;
		this.name = args.name;
		this.graphId = args.graphId;
		this.project = args.project;
		return createMutable(this);
	}

	createInput(args?: { id?: string; name?: string; type?: AnyType }) {
		const id = args?.id ?? (this.inputIdCounter++).toString();
		this.inputs.push(new Field(id, args?.type ?? t.string(), args?.name ?? `Input ${id}`));
	}

	createOutput(args?: { id?: string; name?: string; type?: AnyType }) {
		const id = args?.id ?? (this.outputIdCounter++).toString();
		this.outputs.push(new Field(id, args?.type ?? t.string(), args?.name ?? `Output ${id}`));
	}

	deleteInput(id: string) {
		const idx = this.inputs.findIndex((f) => f.id === id);
		if (idx >= 0) this.inputs.splice(idx, 1);
	}

	deleteOutput(id: string) {
		const idx = this.outputs.findIndex((f) => f.id === id);
		if (idx >= 0) this.outputs.splice(idx, 1);
	}
}
