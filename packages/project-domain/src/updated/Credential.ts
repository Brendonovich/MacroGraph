import { Schema } from "effect";

export class Credential extends Schema.Class<Credential>("Credential")({
	providerId: Schema.String,
	providerUserId: Schema.String,
	displayName: Schema.NullOr(Schema.String),
}) {}

export class FetchFailed extends Schema.TaggedError<FetchFailed>()(
	"Credential/FetchFailed",
	{},
) {}
