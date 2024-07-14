import type { CommentBox } from "@macrograph/runtime";

import { Info } from "./Info";

export function Sidebar(props: { box: CommentBox }) {
	return <Info box={props.box} />;
}
