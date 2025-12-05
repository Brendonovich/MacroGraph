import * as S from "effect/Schema";

export const ResourceValue = S.Struct({
	id: S.String,
	display: S.String,
});
export type ResourceValue = typeof ResourceValue.Type;
