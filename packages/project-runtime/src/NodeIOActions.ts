import { Effect } from "effect";
import {
	DataInputRef,
	DataOutputRef,
	ExecInputRef,
	ExecOutputRef,
	IOId,
	type NodeSchema,
} from "@macrograph/project-domain";
import { IO } from "@macrograph/project-domain/updated";

export class NodeIOActions extends Effect.Service<NodeIOActions>()(
	"NodeIOActions",
	{
		effect: Effect.sync(() => {
			const generateNodeIO = Effect.fnUntraced(function* (schema: NodeSchema) {
				const io = {
					inputs: [] as Array<IO.InputPort>,
					outputs: [] as Array<IO.OutputPort>,
				};

				const shape = schema.io({
					out: {
						exec: (_id, options) => {
							const id = IO.Id.make(_id);
							io.outputs.push({
								id,
								name: options?.name,
								variant: new IO.Exec(),
							});
							return new ExecOutputRef(IOId.make(id), options);
						},
						data: (_id, type, options) => {
							const id = IO.Id.make(_id);
							io.outputs.push({
								id,
								name: options?.name,
								variant: new IO.Data({ type: "String" }),
							});
							return new DataOutputRef(id, type, options);
						},
					},
					in: {
						exec: (_id, options) => {
							const id = IO.Id.make(_id);
							io.inputs.push({
								id,
								name: options?.name,
								variant: new IO.Exec(),
							});
							return new ExecInputRef(id, options);
						},
						data: (_id, type, options) => {
							const id = IO.Id.make(_id);
							io.inputs.push({
								id,
								name: options?.name,
								variant: new IO.Data({ type: "String" }),
							});
							return new DataInputRef(IOId.make(id), type, options);
						},
					},
				});

				return IO.NodeIO.make(Object.assign(io, { shape }));
			});

			return { generateNodeIO };
		}),
	},
) {}
