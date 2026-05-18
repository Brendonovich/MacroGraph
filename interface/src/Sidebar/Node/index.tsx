import type { Node } from "@macrograph/runtime";
import { Show } from "solid-js";

import { NodeInfo } from "./Info";
import { isJavaScriptNode } from "@macrograph/packages/src/script";

import { JavaScriptNode } from "./JavaScriptNode";
import { Properties } from "./Properties";

export function Sidebar(props: { node: Node }) {
	return (
		<>
			<NodeInfo node={props.node} />
			<Show when={isJavaScriptNode(props.node)}>
				<JavaScriptNode node={props.node} />
			</Show>
			<Show
				when={
					!isJavaScriptNode(props.node) &&
					"properties" in props.node.schema &&
					props.node.schema.properties
				}
			>
				{(properties) => (
					<Properties node={props.node} properties={properties()} />
				)}
			</Show>
		</>
	);
}
