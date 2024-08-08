import type { CommentBox } from "@macrograph/runtime";
import { debounce } from "@solid-primitives/scheduled";
import type { ParentProps } from "solid-js";

import { SidebarSection } from "../../components/Sidebar";
import { useInterfaceContext } from "../../context";

function Field(props: ParentProps<{ name: string }>) {
	return (
		<div class="flex flex-col leading-5">
			<label class="text-xs font-medium text-gray-200">{props.name}</label>
			<span>{props.children}</span>
		</div>
	);
}

export function Info(props: { box: CommentBox }) {
	const interfaceCtx = useInterfaceContext();

	const save = debounce(() => interfaceCtx.save(), 200);

	return (
		<SidebarSection title="Comment Box Info" class="p-2 space-y-2">
			<Field name="Text">{props.box.text}</Field>
			<Field name="Tint">
				<input
					type="color"
					value={props.box.tint}
					onInput={(e) => {
						interfaceCtx.execute("setCommentBoxTint", {
							graphId: props.box.graph.id,
							boxId: props.box.id,
							tint: e.currentTarget.value,
						});
						save();
					}}
				/>
			</Field>
		</SidebarSection>
	);
}
