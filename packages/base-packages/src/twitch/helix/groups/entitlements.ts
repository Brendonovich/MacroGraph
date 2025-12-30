import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema as S } from "effect";

export const EntitlementCodeStatus = S.Struct({
	code: S.String,
	status: S.Literal(
		"SUCCESSFULLY_REDEEMED",
		"ALREADY_CLAIMED",
		"EXPIRED",
		"USER_NOT_ELIGIBLE",
		"NOT_FOUND",
		"INACTIVE",
		"UNUSED",
		"INCORRECT_FORMAT",
		"INTERNAL_ERROR",
	),
});

export const EntitlementsUploadUrl = S.Struct({
	url: S.String,
});

export const EntitlementsGroup = HttpApiGroup.make("entitlements")
	.add(
		HttpApiEndpoint.get("getEntitlementCodeStatus", "/codes")
			.setUrlParams(
				S.Struct({
					user_id: S.optional(S.String),
					code: S.optional(S.Array(S.String)),
				}),
			)
			.addSuccess(S.Struct({ data: S.Array(EntitlementCodeStatus) })),
	)
	.add(
		HttpApiEndpoint.post("redeemEntitlementCode", "/code")
			.setUrlParams(
				S.Struct({
					user_id: S.String,
					code: S.Array(S.String),
				}),
			)
			.addSuccess(S.Struct({ data: S.Array(EntitlementCodeStatus) })),
	)
	.add(
		HttpApiEndpoint.post("createEntitlementsUploadUrl", "/upload")
			.setUrlParams(
				S.Struct({
					manifest_id: S.String,
					type: S.String,
				}),
			)
			.addSuccess(S.Struct({ data: S.Array(EntitlementsUploadUrl) })),
	)
	.prefix("/entitlements");
