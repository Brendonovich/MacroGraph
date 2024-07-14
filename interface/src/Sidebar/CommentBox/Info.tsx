import type { CommentBox } from "@macrograph/runtime";
import type { ParentProps } from "solid-js";

import { SidebarSection } from "../../components/Sidebar";
import { useCore } from "../../contexts";
import { debounce } from "@solid-primitives/scheduled";

function Field(props: ParentProps<{ name: string }>) {
	return (
		<div class="flex flex-col leading-5">
			<label class="text-xs font-medium text-gray-200">{props.name}</label>
			<span>{props.children}</span>
		</div>
	);
}

export function Info(props: { box: CommentBox }) {
	const core = useCore();

	const save = debounce(() => {
		core.project.save();
	}, 200);

	return (
		<SidebarSection title="Comment Box Info" class="p-2 space-y-2">
			<Field name="Text">{props.box.text}</Field>
			<Field name="Tint">
				<input
					type="color"
					onInput={(e) => {
						props.box.tint = e.currentTarget.value;
						save();
					}}
				/>
			</Field>
		</SidebarSection>
	);
}
