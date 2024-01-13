import { PropertyDef, ResourceType } from "@macrograph/runtime";
import { Pkg } from ".";

export const OBSInstance = new ResourceType({
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
