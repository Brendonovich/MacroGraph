import { createResourceType, type PropertyDef } from "@macrograph/runtime";

import type { Pkg } from ".";

export const VTubeStudioInstance = createResourceType({
	name: "VTube Studio Instance",
	sources: (pkg: Pkg) =>
		[...pkg.ctx!.instances].map(([url, instance]) => ({
			id: url,
			display: url,
			value: instance.client,
		})),
});

export const instanceProperty = {
	name: "VTube Studio Instance",
	resource: VTubeStudioInstance,
} satisfies PropertyDef;

export const defaultProperties = { instance: instanceProperty };
