import {
	Disposable,
	deserializeType,
	deserializeValue,
	serializeValue,
	type t,
} from "@macrograph/typesystem";
import { trackDeep } from "@solid-primitives/deep";
import { createMutable } from "solid-js/store";
import type * as v from "valibot";

import type { serde } from "@macrograph/runtime-serde";
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

type Serialized = v.InferOutput<typeof serde.Variable>;

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

	serialize(): Serialized {
		return {
			id: this.id,
			name: this.name,
			value: serializeValue(this.value, this.type),
			type: this.type.serialize(),
		};
	}

	static deserialize(data: Serialized, owner: Graph | Project) {
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
