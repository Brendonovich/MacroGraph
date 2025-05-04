import { createSignal } from "solid-js";

import type { Ctx } from "./ctx";

export default function ({ core, setAccountKey, accountKey, admin }: Ctx) {
	const fileInputRef = createSignal<HTMLInputElement | null>(null);

	const handleFileSelect = async (e: Event) => {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		console.log(file);
	};

	return (
		<div class="flex flex-col items-start gap-2">
			{/* <input
				ref={fileInputRef}
				type="file"
				accept=".json"
				onChange={handleFileSelect}
				class="block"
			/>
			<p class="text-neutral-400 text-sm mt-1">
				Select a JSON file with your auth token (e.g., {"{ token: 'abc123' }"})
			</p> */}
		</div>
	);
}
