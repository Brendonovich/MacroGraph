import { Schema as S } from "effect";

export namespace Event {
	export class CurrentProgramSceneChanged extends S.TaggedClass<CurrentProgramSceneChanged>()(
		"CurrentProgramSceneChanged",
		{
			sceneName: S.String,
			sceneUuid: S.String,
		},
	) {}

	export const Any = S.Union(CurrentProgramSceneChanged);
}
