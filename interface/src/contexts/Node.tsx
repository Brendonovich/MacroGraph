import type { Node } from "@macrograph/runtime";
import { type ParentProps, createContext, useContext } from "solid-js";

const NodeContext = createContext<Node>(null as any);

export const useNode = () => {
	const ctx = useContext(NodeContext);
	if (!ctx) throw new Error("NodeContext not found!");

	return ctx;
};

export const NodeProvider = (props: ParentProps<{ node: Node }>) => {
	return (
		<NodeContext.Provider value={props.node}>
			{props.children}
		</NodeContext.Provider>
	);
};
