import * as S from "effect/Schema";

import { T } from "./IO";
import { Resource } from "./NodeSchema";
import * as Schema from "./Schema";

export const Id = S.String.pipe(S.brand("Package.Id"));
export type Id = S.Schema.Type<typeof Id>;

export class NotFound extends S.TaggedError<NotFound>()("Package.NotFound", {
	id: Id,
}) {}

export class Package extends S.Class<Package>("Package")({
	id: Id,
	name: S.String,
	schemas: S.suspend(() =>
		S.Map({
			key: Schema.Id,
			value: S.Struct({
				id: Schema.Id,
				type: Schema.Type,
				name: S.String,
				description: S.optional(S.String),
				properties: S.Array(
					S.Union(
						S.Struct({ type: T.AnySchema_ }),
						S.Struct({ resource: S.String }),
					).pipe(S.extend(S.Struct({ id: S.String, name: S.String }))),
				),
			}),
		}),
	),
	resources: S.Record({
		key: S.String,
		value: S.Struct({
			name: S.String,
			values: S.Array(Resource.ResourceValue),
		}),
	}),
}) {}
