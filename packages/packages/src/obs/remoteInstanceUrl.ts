import { Maybe, None, type Option, Some } from "@macrograph/option";
import { DEFAULT, type Node } from "@macrograph/runtime";

import { defaultProperties } from "./resource";

type InstanceProp = (typeof defaultProperties)["instance"];
const INSTANCE_PROP_ID = "instance";

/** URL / host string stored as the OBS instance resource source id. */
export function getObsInstanceSourceUrl(
	node: Node,
	instanceProperty: InstanceProp = defaultProperties.instance,
): Option<string> {
	const { resource } = instanceProperty;
	const value = node.state.properties[INSTANCE_PROP_ID];
	return Maybe(node.graph.project.resources.get(resource))
		.andThen((instance) =>
			Maybe(
				instance.items.find(
					(i) => i.id === (value === DEFAULT ? instance.default : value),
				),
			),
		)
		.andThen((item) => {
			if (!("sourceId" in item) || item.sourceId == null) return None;
			return Some(item.sourceId);
		});
}
