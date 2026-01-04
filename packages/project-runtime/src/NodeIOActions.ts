import { Effect } from "effect";
import type { Schema } from "@macrograph/package-sdk/updated";
import { IO, type IOFunctionContext } from "@macrograph/project-domain";

export class NodeIOActions extends Effect.Service<NodeIOActions>()(
	"NodeIOActions",
	{
		effect: Effect.sync(() => {
			const generateNodeIO = Effect.fnUntraced(function* (schema: Schema.Any) {
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
							return new IO.ExecOutput({ id });
						},
						data: (_id, type, options) => {
							const id = IO.Id.make(_id);
							io.outputs.push({
								id,
								name: options?.name,
								variant: new IO.Data({ type: IO.T.serialize(type) }),
							});
							return new IO.DataOutput({ id, type });
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
							return new IO.ExecInput({ id });
						},
						data: (_id, type, options) => {
							const id = IO.Id.make(_id);
							io.inputs.push({
								id,
								name: options?.name,
								variant: new IO.Data({ type: IO.T.serialize(type) }),
							});
							return new IO.DataInput({ id, type });
						},
					},
				} as IOFunctionContext);

				return { ...io, shape };
			});

			return { generateNodeIO };
		}),
	},
) {}
