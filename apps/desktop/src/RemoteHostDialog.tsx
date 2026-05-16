import {
	Button,
	Dialog,
	DialogCloseButton,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogTitle,
	DialogTrigger,
} from "@macrograph/ui";
import { createEffect, createSignal } from "solid-js";
import { createStore } from "solid-js/store";

import {
	remoteHostSettings,
	setRemoteHostSettings,
} from "./remoteHostSettings";

export function RemoteHostDialog() {
	const [open, setOpen] = createSignal(false);
	const [draft, setDraft] = createStore({
		enabled: false,
		port: 37564,
		password: "",
	});

	const syncDraftFromPersisted = () => {
		setDraft({
			enabled: remoteHostSettings.enabled,
			port: remoteHostSettings.port,
			password: remoteHostSettings.password ?? "",
		});
	};

	createEffect(() => {
		if (open()) syncDraftFromPersisted();
	});

	const save = () => {
		setRemoteHostSettings("enabled", draft.enabled);
		setRemoteHostSettings("port", draft.port);
		setRemoteHostSettings("password", draft.password);
		setOpen(false);
	};

	const cancel = () => {
		syncDraftFromPersisted();
		setOpen(false);
	};

	return (
		<Dialog open={open()} onOpenChange={setOpen}>
			<DialogTrigger as={Button} size="icon" variant="ghost" title="Remote web editor">
				<IconMdiConnection class="size-5" />
			</DialogTrigger>
			<DialogContent
				class="p-6 max-w-lg"
				onPointerDownOutside={(e) => e.preventDefault()}
				onInteractOutside={(e) => e.preventDefault()}
			>
				<div class="flex flex-row justify-between items-start gap-2">
					<DialogTitle class="text-xl">Remote web editor</DialogTitle>
					<DialogCloseButton />
				</div>
				<DialogDescription class="text-neutral-300 mt-2 text-sm leading-relaxed">
					Serves the graph editor over HTTP on your LAN (binds to all interfaces).
					Open <span class="text-white">http://&lt;this-PC-LAN-IP&gt;:{draft.port}</span>{" "}
					from another device. Port-forward that TCP port on your router to allow WAN
					access. Execution and credentials stay on this machine.
				</DialogDescription>

				<label class="flex items-center gap-2 mt-6 cursor-pointer">
					<input
						type="checkbox"
						checked={draft.enabled}
						onChange={(e) => setDraft("enabled", e.currentTarget.checked)}
					/>
					<span>Enable remote host</span>
				</label>

				<div class="mt-4 flex flex-col gap-1">
					<span class="text-sm text-neutral-400">Port</span>
					<input
						class="bg-neutral-800 border border-neutral-600 rounded px-2 py-1.5 text-white"
						type="number"
						min={1}
						max={65535}
						value={draft.port}
						onInput={(e) => {
							const v = Number(e.currentTarget.value);
							if (Number.isFinite(v) && v >= 1 && v <= 65535) {
								setDraft("port", Math.floor(v));
							}
						}}
					/>
				</div>

				<div class="mt-4 flex flex-col gap-1">
					<span class="text-sm text-neutral-400">Password (optional)</span>
					<input
						class="bg-neutral-800 border border-neutral-600 rounded px-2 py-1.5 text-white"
						type="password"
						autocomplete="new-password"
						placeholder="Leave empty for no password"
						value={draft.password}
						onInput={(e) => setDraft("password", e.currentTarget.value)}
					/>
					<span class="text-xs text-neutral-500">
						Remote browsers must enter this password before editing. Stored only on this
						machine (not hashed).
					</span>
				</div>

				<DialogFooter class="mt-8 gap-2 sm:gap-2">
					<Button type="button" variant="secondary" onClick={() => cancel()}>
						Cancel
					</Button>
					<Button type="button" onClick={() => save()}>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
