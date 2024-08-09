import type { CommentBox } from "@macrograph/runtime";
import { debounce } from "@solid-primitives/scheduled";
import { type ParentProps, runWithOwner } from "solid-js";

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

	let color: string | undefined;
	const saveColour = runWithOwner(null, () =>
		debounce((graphId: number, boxId: number, tint: string) => {
			interfaceCtx.execute("setCommentBoxTint", {
				graphId,
				boxId,
				tint,
				prev: color,
			});
			color = undefined;
		}, 500),
	)!;

	return (
		<SidebarSection title="Comment Box Info" class="p-2 space-y-2">
			<Field name="Text">{props.box.text}</Field>
			<Field name="Tint">
				<input
					type="color"
					value={props.box.tint}
					onInput={(e) => {
						if (color === undefined) color = props.box.tint;

						interfaceCtx.execute(
							"setCommentBoxTint",
							{
								graphId: props.box.graph.id,
								boxId: props.box.id,
								tint: e.currentTarget.value,
							},
							{ ephemeral: true },
						);

						saveColour(props.box.graph.id, props.box.id, e.currentTarget.value);
					}}
				/>
			</Field>
		</SidebarSection>
	);
}
