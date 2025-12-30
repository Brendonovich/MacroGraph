import { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";
import { Schema as S } from "effect";

export const AdDetails = S.Struct({
	length: S.Literal(30, 60, 90, 120, 150, 180),
	message: S.String,
	retry_after: S.Int,
});

export const Category = S.Struct({
	id: S.String,
	name: S.String,
	box_art_url: S.String,
});

export const Pagination = S.Struct({
	cursor: S.String,
});

export const AdsGroup = HttpApiGroup.make("ads")
	.add(
		HttpApiEndpoint.post("startCommercial", "/")
			.setUrlParams(
				S.Struct({
					broadcaster_id: S.String,
					length: S.String,
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Struct({
						data: S.Array(AdDetails),
					}),
				}),
			),
	)
	.prefix("/channels/commercial");

export const CategoriesGroup = HttpApiGroup.make("categories")
	.add(
		HttpApiEndpoint.get("searchCategories", "/")
			.setUrlParams(
				S.Struct({
					query: S.String,
					after: S.optional(S.String),
					first: S.optional(S.String),
				}),
			)
			.addSuccess(
				S.Struct({
					data: S.Struct({
						data: S.Array(Category),
						pagination: S.optional(Pagination),
					}),
				}),
			),
	)
	.prefix("/search/categories");
