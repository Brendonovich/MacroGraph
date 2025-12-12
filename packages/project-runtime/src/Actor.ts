import { Context, Layer } from "effect";
import { Actor as DActor } from "@macrograph/project-domain/updated";

export const Actor = DActor.Actor;
export type Actor = DActor.Actor;

export class Current extends Context.Tag("Actor/Current")<
	Current,
	DActor.Actor
>() {}

export const layerSystem = Layer.succeed(Current, { type: "SYSTEM" });
