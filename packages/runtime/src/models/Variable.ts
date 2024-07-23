import {
	Disposable,
	deserializeType,
	deserializeValue,
	serializeValue,
	type t,
} from "@macrograph/typesystem";
import { trackDeep } from "@solid-primitives/deep";
import { createMutable } from "solid-js/store";
import type { z } from "zod";

import { createEffect, createRoot, getOwner, on, runWithOwner } from "solid-js";
import { Graph } from "./Graph";
import type { Project } from "./Project";
import type { SerializedVariable } from "./serialized";

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
	owner: Graph | Project;

	constructor(args: VariableArgs) {
		super();

		this.id = args.id;
		this.name = args.name;
		this.type = args.type;
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
						if (self.owner instanceof Graph) self.owner.project.save();
						else self.owner.save();
					},
				),
			);

			createEffect(
				on(
					() => self.type,
					() => {
						if (self.owner instanceof Graph) self.owner.project.save();
						else self.owner.save();
					},
				),
			);
		});

		return self;
	}

	serialize(): z.infer<typeof SerializedVariable> {
		return {
			id: this.id,
			name: this.name,
			value: serializeValue(this.value, this.type),
			type: this.type.serialize(),
		};
	}

	static deserialize(
		data: z.infer<typeof SerializedVariable>,
		owner: Graph | Project,
	) {
		const project = owner instanceof Graph ? owner.project : owner;
		const type = deserializeType(data.type, project.getType.bind(project));

		return new Variable({
			id: data.id,
			name: data.name,
			value: deserializeValue(data.value, type),
			type,
			owner,
		});
	}
}
