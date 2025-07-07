import type { ComponentProps } from "solid-js";

import { Avatar } from "../Avatar";

export function PresencePointer(
	props: Pick<ComponentProps<"div">, "style"> & {
		name: string;
		colour: string;
	},
) {
	return (
		<div
			class="bg-white/70 rounded-full size-2 absolute -left-1 -top-1 pointer-events-none"
			style={props.style}
		>
			<Avatar
				name={props.name}
				class="absolute top-full left-full -mt-0.5 -ml-0.5 text-white rounded shadow-lg border border-gray-2"
				style={{ "background-color": props.colour }}
			/>
		</div>
	);
}
