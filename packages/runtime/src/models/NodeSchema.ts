import { Maybe, type Option } from "@macrograph/option";
import {
	type AnyType,
	type BaseType,
	type PrimitiveType,
	Wildcard,
	type t,
} from "@macrograph/typesystem";
import type { EventBus } from "@solid-primitives/event-bus";
// import type { RenderedSchema } from "@macrograph/schema-rendering";
import type { RenderedSchema } from "../schemaRendering";

import { batch } from "solid-js";
import type { Graph } from "./Graph";
import {
	DataInput,
	DataOutput,
	ExecInput,
	ExecOutput,
	Scope,
	ScopeBuilder,
	ScopeInput,
	ScopeOutput,
} from "./IO";
import type { Node } from "./Node";
import type { Package, ResourceType, inferResourceTypeValue } from "./Package";
import type { Variable } from "./Variable";

export type NodeSchemaVariant =
	| "Base"
	| "Pure"
	| "Exec"
	| "Event"
	| "base"
	| "pure"
	| "exec"
	| "event";

export type DataInputBuilder =
	| {
			id: string;
			name?: string;
			type: AnyType;
	  }
	| {
			id: string;
			name?: string;
			type: t.String;
			fetchSuggestions?(): Promise<string[]>;
	  };
export type ExecInputBuilder = {
	id: string;
	name?: string;
};

export type ScopeInputBuilder = {
	id: string;
	name?: string;
};

export type InputBuilder =
	| ({ variant: "Data" } & DataInputBuilder)
	| ({ variant: "Exec" } & ExecInputBuilder)
	| ({ variant: "Scope" } & ScopeInputBuilder);

export type DataOutputBuilder = {
	id: string;
	name?: string;
	type: AnyType;
};

export type ExecOutputBuilder = { id: string; name?: string };

export type ScopeOutputBuilder = {
	id: string;
	name?: string;
	scope: (s: ScopeBuilder) => void;
};

export type OutputBuilder =
	| ({ variant: "Data" } & DataOutputBuilder)
	| ({ variant: "Exec" } & ExecOutputBuilder)
	| ({ variant: "Scope" } & ScopeOutputBuilder);

export class IOBuilder {
	inputs: (DataInput<BaseType> | ExecInput | ScopeInput)[] = [];
	outputs: (DataOutput<BaseType> | ExecOutput | ScopeOutput)[] = [];

	wildcards = new Map<string, Wildcard>();

	constructor(
		public node: Node,
		public previous?: IOBuilder,
	) {}

	wildcard(id: string) {
		const wildcard = Maybe(this.previous?.wildcards.get(id)).unwrapOrElse(
			() => new Wildcard(id),
		);

		this.wildcards.set(id, wildcard);

		return wildcard;
	}

	dataInput<T extends DataInputBuilder>(args: T) {
		const newInput = Maybe(
			this.previous?.inputs.find(
				(i): i is DataInput<T["type"]> =>
					i.id === args.id && i instanceof DataInput && i.type.eq(args.type),
			),
		).unwrapOrElse(() => new DataInput({ ...args, node: this.node }));

		batch(() => {
			newInput.name = args.name;
			newInput.fetchSuggestions = (args as any).fetchSuggestions;

			this.inputs.push(newInput);
		});

		return newInput;
	}

	dataOutput<T extends DataOutputBuilder>(args: T) {
		const newOutput = Maybe(
			this.previous?.outputs.find(
				(o): o is DataOutput<T["type"]> =>
					o.id === args.id && o instanceof DataOutput && o.type.eq(args.type),
			),
		).unwrapOrElse(() => new DataOutput({ ...args, node: this.node }));

		batch(() => {
			newOutput.name = args.name;

			this.outputs.push(newOutput);
		});

		return newOutput;
	}

	execInput<T extends ExecInputBuilder>(args: T) {
		const newInput = Maybe(
			this.previous?.inputs.find(
				(i): i is ExecInput => i.id === args.id && i instanceof ExecInput,
			),
		).unwrapOrElse(() => new ExecInput({ ...args, node: this.node }));

		newInput.name = args.name;

		this.inputs.push(newInput);

		return newInput;
	}

	execOutput<T extends ExecOutputBuilder>(args: T) {
		const newOutput = Maybe(
			this.previous?.outputs.find(
				(o): o is ExecOutput => o.id === args.id && o instanceof ExecOutput,
			),
		).unwrapOrElse(() => new ExecOutput({ ...args, node: this.node }));

		newOutput.name = args.name;

		this.outputs.push(newOutput);

		return newOutput;
	}

	scopeInput<T extends ScopeInputBuilder>(args: T) {
		const newInput = Maybe(
			this.previous?.inputs.find(
				(i): i is ScopeInput => i.id === args.id && i instanceof ScopeInput,
			),
		).unwrapOrElse(() => new ScopeInput({ ...args, node: this.node }));

		newInput.name = args.name;

		this.inputs.push(newInput);

		return newInput;
	}

	scopeOutput<T extends ScopeOutputBuilder>(args: T) {
		const newOutput = Maybe(
			this.previous?.outputs.find(
				(o): o is ScopeOutput => o.id === args.id && o instanceof ScopeOutput,
			),
		).unwrapOrElse(() => {
			const builder = new ScopeBuilder();
			args.scope(builder);

			return new ScopeOutput({
				...args,
				scope: new Scope(builder),
				node: this.node,
			});
		});

		newOutput.name = args.name;

		this.outputs.push(newOutput);

		return newOutput;
	}
}

export interface IOSchema {
	inputs?: Record<string, InputBuilder>;
	outputs?: Record<string, OutputBuilder>;
}

export type inferInput<TInput extends DataInput<BaseType<any>> | ScopeInput> =
	TInput extends DataInput<infer T>
		? t.infer<T>
		: TInput extends ScopeInput
			? Record<string, unknown>
			: never;

export type RunCtx = {
	exec(t: ExecOutput): Promise<void>;
	execScope(t: ScopeOutput, data: Record<string, any>): Promise<void>;
	setOutput<TOutput extends DataOutput<any>>(
		output: TOutput,
		data: t.infer<TOutput["type"]>,
	): void;
	getInput<TInput extends DataInput<BaseType<any>> | ScopeInput>(
		input: TInput,
	): inferInput<TInput>;
	getProperty<TProperty extends PropertyDef & { id: string }>(
		property: TProperty,
	): inferPropertyDef<TProperty>;
	getVariable(source: "graph" | "project", id: number): Option<Variable>;
	setVariable(source: "graph" | "project", id: number, value: any): void;
};

export type EventsMap<T extends string = string> = Record<T, any>;

export type NodeSchema<TEvents extends EventsMap = EventsMap> =
	| NonEventNodeSchema<any, Record<string, PropertyDef>>
	| EventNodeSchema<TEvents, keyof TEvents, any, Record<string, PropertyDef>>
	| EventSchema<Record<string, PropertyDef>, any, any>
	| NonEventSchema<Record<string, PropertyDef>, any>;

export type PropertyValue = { id: string | number; display: string };
export type inferPropertyValue<TValue extends PropertyValue> = TValue["id"];

export type PropertySourceFn = (args: { node: Node }) => Array<PropertyValue>;
export type inferPropertySourceFn<TFn extends PropertySourceFn> =
	| inferPropertyValue<ReturnType<TFn>[number]>
	| undefined;

export type PropertyDef = { name: string } & (
	| { source: PropertySourceFn }
	| { type: PrimitiveType; default?: any }
	| { resource: ResourceType<any, any> }
);

export type Property = PropertyDef & { id: string };

export type inferPropertyDef<TProperty extends PropertyDef> =
	TProperty extends { type: PrimitiveType }
		? t.infer<TProperty["type"]>
		: TProperty extends { source: PropertySourceFn }
			? inferPropertySourceFn<TProperty["source"]>
			: TProperty extends { resource: ResourceType<any, any> }
				? Option<inferResourceTypeValue<TProperty["resource"]>>
				: never;

export type SchemaProperties<TProperties = Record<string, PropertyDef>> = {
	[K in keyof TProperties]: {
		id: K;
	} & TProperties[K];
};

export type GenerateIOCtx = {
	graph: Graph;
	getProperty<TProperty extends PropertyDef & { id: string }>(
		property: TProperty,
	): inferPropertyDef<TProperty>;
};

export type BaseNodeSchema<
	TIO = void,
	TProperties extends Record<string, PropertyDef> = Record<string, PropertyDef>,
> = {
	name: string;
	createIO: (args: {
		io: IOBuilder;
		ctx: GenerateIOCtx;
		properties: SchemaProperties<TProperties>;
		graph: Graph;
	}) => TIO;
	package: Package<EventsMap>;
	properties?: SchemaProperties<TProperties>;
};

type BaseRunArgs<
	TIO = void,
	TProperties extends Record<string, PropertyDef> = Record<string, PropertyDef>,
> = {
	ctx: RunCtx;
	properties: SchemaProperties<TProperties>;
	io: TIO;
	graph: Graph;
};

export type NonEventNodeSchema<
	TIO = void,
	TProperties extends Record<string, PropertyDef> = Record<string, PropertyDef>,
> = BaseNodeSchema<TIO, TProperties> & {
	variant: "Base" | "Pure" | "Exec";
	run: (a: BaseRunArgs<TIO, TProperties>) => void | Promise<void>;
};

export type EventNodeSchema<
	TEvents extends EventsMap = EventsMap,
	TEvent extends keyof TEvents = string,
	TIO = void,
	TProperties extends Record<string, PropertyDef> = Record<string, PropertyDef>,
> = BaseNodeSchema<TIO, TProperties> & {
	event:
		| TEvent
		| ((arg: {
				ctx: GenerateIOCtx;
				properties: SchemaProperties<TProperties>;
		  }) => TEvent | undefined);
	run: (
		a: BaseRunArgs<TIO, TProperties> & {
			data: TEvents[TEvent];
		},
	) => void;
};

// NEW STUFF

export type CreateIOFn<TProperties, TIO> = (args: {
	ctx: GenerateIOCtx;
	io: IOBuilder;
	properties: SchemaProperties<TProperties>;
}) => TIO;

export type MergeFnProps<Fn, Props> = Fn extends (
	arg: infer FnProps extends Record<string, any>,
) => infer Ret
	? (props: FnProps & Props) => Ret
	: never;

export type SchemaBase<TProperties, TIO> = {
	name: string;
	properties: SchemaProperties<TProperties>;
	createIO: CreateIOFn<TProperties, TIO>;
	package: Package;
	rendered?: RenderedSchema;
};

export type RunProps<TProperties, TIO> = {
	properties: SchemaProperties<TProperties>;
	ctx: RunCtx;
	io: TIO;
};

export type EventSchema<TProperties, TIO, TFire> = SchemaBase<
	TProperties,
	TIO
> & {
	type: "event";
	createListener(args: {
		ctx: GenerateIOCtx;
		properties: SchemaProperties<TProperties>;
	}): EventBus<TFire>;
	run(
		props: RunProps<TProperties, TIO> & { data: TFire },
	): void | Promise<void>;
};

export type NonEventSchema<TProperties, TIO> = SchemaBase<TProperties, TIO> & {
	type: "exec" | "pure" | "base";
	run(props: RunProps<TProperties, TIO>): any | Promise<any>;
};

export type Schema<TProperties, TIO, TFire> =
	| EventSchema<TProperties, TIO, TFire>
	| NonEventSchema<TProperties, TIO>;

export type CreateEventSchema<
	TProperties extends Record<string, PropertyDef>,
	TIO,
	TFire,
> = Omit<EventSchema<TProperties, TIO, TFire>, "package" | "properties"> & {
	properties?: TProperties;
};

export type CreateNonEventSchema<
	TProperties extends Record<string, PropertyDef>,
	TIO,
> = Omit<NonEventSchema<TProperties, TIO>, "package" | "properties"> & {
	properties?: TProperties;
};

export type CreateSchema<
	TProperties extends Record<string, PropertyDef>,
	TIO,
	TFire,
> =
	| CreateEventSchema<TProperties, TIO, TFire>
	| CreateNonEventSchema<TProperties, TIO>;
