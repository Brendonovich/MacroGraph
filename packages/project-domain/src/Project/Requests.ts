import { Schema } from "effect";

import * as Graph from "../Graph";
import { PackageMeta } from "../types";
import { PolicyDeniedError } from "../Policy";

export class GetProject extends Schema.TaggedRequest<GetProject>()(
	"GetProject",
	{
		payload: {},
		success: Schema.Struct({
			name: Schema.String,
			graphs: Schema.Record({ key: Schema.String, value: Graph.Shape }),
			packages: Schema.Record({ key: Schema.String, value: PackageMeta }),
		}),
		failure: PolicyDeniedError,
	},
) {}

export class GetPackageSettings extends Schema.TaggedRequest<GetPackageSettings>()(
	"GetPackageSettings",
	{
		payload: { package: Schema.String },
		success: Schema.Any,
		failure: PolicyDeniedError,
	},
) {}
