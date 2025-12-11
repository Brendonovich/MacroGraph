import { Context } from "effect";
import type { Actor } from "@macrograph/project-domain/updated";

export type { Actor };

export class Current extends Context.Tag("Actor/Current")<
	Current,
	Actor.Actor
>() {}
