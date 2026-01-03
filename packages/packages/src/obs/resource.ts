import { createResourceType, type PropertyDef } from "@macrograph/runtime";

import type { Pkg } from ".";

export const OBSInstance = createResourceType({
	name: "OBS Instance",
	sources: (pkg: Pkg) =>
		[...pkg.ctx!.instances].map(([ip, instance]) => ({
			id: ip,
			display: ip,
			value: instance,
		})),
});

export const instanceProperty = {
	name: "OBS Instance",
	resource: OBSInstance,
} satisfies PropertyDef;

export const defaultProperties = { instance: instanceProperty };
