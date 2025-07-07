import { Context, Data, Exit, Layer } from "effect";
import * as Effect from "effect/Effect";
import type { ParseError } from "effect/ParseResult";
import * as Schema from "effect/Schema";

export interface ServerFn<
	TId extends string = string,
	TIn extends Schema.Schema<any> = Schema.Schema<any>,
	TOut extends Schema.Schema<any> = Schema.Schema<void>,
	TErr extends Schema.Schema<any> = Schema.Schema<void>,
> {
	id: TId;
	/* @internal */
	key: string;
	schemas: {
		input?: TIn;
		output?: TOut;
		error?: TErr;
	};
	toLayer: (
		handler: HandlerFn<TIn, TOut, TErr>,
	) => Layer.Layer<Handler<TId>, never, never>;
	handler: (
		handler: HandlerFnFrom<ServerFn<TId, TIn, TOut, TErr>>,
	) => HandlerFn<TIn, TOut, TErr>;
}

type HandlerFn<
	TIn extends Schema.Schema<any> = Schema.Schema<any>,
	TOut extends Schema.Schema<any> = Schema.Schema<void>,
	TErr extends Schema.Schema<any> = Schema.Schema<void>,
> = (
	input: TIn["Encoded"],
) => Promise<Schema.ExitEncoded<TOut["Encoded"], TErr["Encoded"], never>>;

export interface Handler<TId extends string> {
	id: TId;
	handler: (v: any) => Promise<Schema.ExitEncoded<any, any, never>>;
}

export const make = <
	TId extends string,
	TIn extends Schema.Schema<any>,
	TOut extends Schema.Schema<any>,
	TErr extends Schema.Schema<any>,
>(
	id: TId,
	schemas?: {
		input?: TIn;
		output?: TOut;
		error?: TErr;
	},
): ServerFn<TId, TIn, TOut, TErr> => {
	const key = `@macrograph/server-function/${id}`;
	return {
		id,
		key,
		schemas: schemas ?? {},
		toLayer: (handler) =>
			Layer.scopedContext(
				Effect.sync(() =>
					Context.unsafeMake(new Map([[key, { id, handler }]])),
				),
			),
		handler: (handle) => async (data) =>
			Effect.gen(function* () {
				const input = Schema.decode(schemas?.input ?? Schema.Any, data);

				const e = yield* handle(
					schemas?.input ? input : (undefined as any),
				).pipe(Effect.exit);

				const f = Schema.Exit({
					success: (schemas?.output ?? Schema.Void) as TOut,
					failure: (schemas?.error ?? Schema.Void) as TErr,
					defect: Schema.Never,
				});

				const b = Schema.encodeUnknown(f);

				return (yield* b(
					e.pipe(
						Exit.mapBoth({
							onSuccess: (v) =>
								(schemas?.output ? v : undefined) as any as TOut["Type"],
							onFailure: (v) =>
								(schemas?.error ? v : undefined) as any as TErr["Type"],
						}),
					),
				)) as unknown as Schema.ExitEncoded<TOut, TErr, never>;
			}).pipe(
				(v) =>
					v as Effect.Effect<
						Effect.Effect.Success<typeof v>,
						Effect.Effect.Error<typeof v>,
						Exclude<
							Effect.Effect.Context<typeof v>,
							Schema.Schema.Context<TOut> | Schema.Schema.Context<TErr>
						>
					>,
				Effect.runPromise,
			),
	};
};

export const call = <
	TId extends string,
	TIn extends Schema.Schema<any>,
	TOut extends Schema.Schema<any>,
	TErr extends Schema.Schema<any>,
>(
	fn: ServerFn<TId, TIn, TOut, TErr>,
	input: TIn["Encoded"],
) =>
	Effect.gen(function* () {
		const context = yield* Effect.context<never>();
		const { handler }: { handler: HandlerFn<TIn, TOut, TErr> } =
			context.unsafeMap.get(fn.key);

		const decode = (
			Schema.Exit({
				defect: Schema.Never,
				success: fn.schemas.output ?? Schema.Any,
				failure: fn.schemas.error ?? Schema.Any,
			}) as Schema.Exit<TOut, TErr, typeof Schema.Never>
		).pipe(Schema.decode);

		return yield* Effect.tryPromise({
			try: () => handler(input),
			catch: (e) => {
				console.log({ e });
				new ServerFnError({ type: "Execution" });
			},
		}).pipe(
			Effect.andThen(
				(v) =>
					decode(v as any) as Effect.Effect<
						Exit.Exit<TOut["Encoded"], TErr["Encoded"]>,
						ParseError,
						never
					>,
			),
			Effect.catchTag(
				"ParseError",
				() => new ServerFnError({ type: "Decoding" }),
			),
			Effect.flatten,
		);
	});

export type HandlerFnFrom<TFn extends ServerFn<any, any, any, any>> = (
	v: TFn["schemas"]["input"] extends undefined
		? void
		: NonNullable<TFn["schemas"]["input"]>["Type"],
) => Effect.Effect<
	NonNullable<TFn["schemas"]["output"]>["Type"],
	NonNullable<TFn["schemas"]["error"]>["Type"],
	never
>;

export class ServerFnError extends Data.TaggedError("ServerFnError")<{
	type: "Encoding" | "Decoding" | "Execution";
}> {}
