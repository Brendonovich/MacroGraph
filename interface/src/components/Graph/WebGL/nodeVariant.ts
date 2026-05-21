import type { Node } from "@macrograph/runtime";

import type { Rgba } from "./webglContext";
import { hexToRgba } from "./webglContext";

const VARIANT_COLOURS: Record<string, Rgba> = {
	Exec: hexToRgba("#2163EB", 1),
	exec: hexToRgba("#2163EB", 1),
	Base: hexToRgba("#696969", 1),
	base: hexToRgba("#696969", 1),
	Event: hexToRgba("#C20000", 1),
	event: hexToRgba("#C20000", 1),
	Pure: hexToRgba("#008E62", 1),
	pure: hexToRgba("#008E62", 1),
};

export function nodeVariantColour(node: Node): Rgba {
	const schema = node.schema;
	const key =
		"variant" in schema
			? String(schema.variant)
			: "type" in schema
				? String(schema.type)
				: "Event";
	return VARIANT_COLOURS[key] ?? VARIANT_COLOURS.Event;
}
