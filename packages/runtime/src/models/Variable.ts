import { Disposable, type t } from "@macrograph/typesystem";
import { createMutable } from "solid-js/store";

import { trackDeep } from "@solid-primitives/deep";
import { createEffect, createRoot, getOwner, on, runWithOwner } from "solid-js";
import { Graph } from "./Graph";
import type { Project } from "./Project";

export type VariableArgs = {
	id: number;
	name: string;
	type: t.Any;
	value: any;
	owner: Graph | Project;
};

export class Variable extends Disposable {
	id: number;
	name: string;
	type: t.Any;
	value: any;
	previous: any;
	owner: Graph | Project;

	constructor(args: VariableArgs) {
		super();

		this.id = args.id;
		this.name = args.name;
		this.type = args.type;
		this.value = args.value;
		this.previous = args.value;
		this.owner = args.owner;

		const self = createMutable(this);

		const { owner, dispose } = createRoot((dispose) => ({
			owner: getOwner(),
			dispose,
		}));

		this.addDisposeListener(dispose);

		runWithOwner(owner, () => {
			createEffect(
				on(
					() => trackDeep(self.value),
					() => {
						if (self.owner instanceof Graph)
							self.owner.project.emit("modified");
						else self.owner.emit("modified");
					},
				),
			);
			createEffect(
				on(
					() => self.type,
					() => {
						if (self.owner instanceof Graph)
							self.owner.project.emit("modified");
						else self.owner.emit("modified");
					},
				),
			);
		});

		return self;
	}
}
