import { Effect } from "effect";
import {
	DataInput,
	DataOutput,
	ExecInput,
	ExecOutput,
	type IOFunctionContext,
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
							return new ExecOutput({ id });
						},
						data: (_id, type, options) => {
							const id = IO.Id.make(_id);
							io.outputs.push({
								id,
								name: options?.name,
								variant: new IO.Data({ type: IO.T.serialize(type) }),
							});
							return new DataOutput({ id, type });
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
							return new ExecInput({ id });
						},
						data: (_id, type, options) => {
							const id = IO.Id.make(_id);
							io.inputs.push({
								id,
								name: options?.name,
								variant: new IO.Data({ type: IO.T.serialize(type) }),
							});
							return new DataInput({ id, type });
						},
					},
				} as IOFunctionContext);

				return Object.assign(io, { shape });
			});

			return { generateNodeIO };
		}),
	},
) {}
