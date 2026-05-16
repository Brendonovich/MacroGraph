import { Disposable, type t } from "@macrograph/typesystem";
import { createMutable } from "solid-js/store";

import { trackDeep } from "@solid-primitives/deep";
import { createEffect, createRoot, getOwner, on, runWithOwner } from "solid-js";
import type { Project } from "./Project";

export type QueueArgs = {
	id: number;
	name: string;
	itemType: t.Any;
	value: any[];
	owner: Project;
};

export class Queue extends Disposable {
	id: number;
	name: string;
	itemType: t.Any;
	value: any[];
	owner: Project;

	constructor(args: QueueArgs) {
		super();

		this.id = args.id;
		this.name = args.name;
		this.itemType = args.itemType;
		this.value = args.value;
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
						self.owner.emit("modified");
					},
				),
			);
			createEffect(
				on(
					() => self.itemType,
					() => {
						self.owner.emit("modified");
					},
				),
			);
		});

		return self;
	}
}
