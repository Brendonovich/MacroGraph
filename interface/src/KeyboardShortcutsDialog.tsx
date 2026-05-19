import {
	Button,
	Dialog,
	DialogCloseButton,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "@macrograph/ui";
import { createEventListener } from "@solid-primitives/event-listener";
import { For, createSignal } from "solid-js";
import {
	KEYBOARD_SHORTCUTS,
	formatChord,
	shortcutsByCategory,
} from "./keyboardShortcuts";
import { isEditingText } from "./util";

export const [keyboardShortcutsOpen, setKeyboardShortcutsOpen] =
	createSignal(false);

function ShortcutKeys(props: {
	chords: (typeof KEYBOARD_SHORTCUTS)[0]["chords"];
}) {
	return (
		<span class="flex flex-wrap gap-1.5 justify-end shrink-0">
			<For each={props.chords}>
				{(chord, i) => (
					<>
						{i() > 0 && (
							<span class="text-neutral-500 text-xs self-center">or</span>
						)}
						<kbd class="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-600 text-xs font-mono text-neutral-200 whitespace-nowrap">
							{formatChord(chord)}
						</kbd>
					</>
				)}
			</For>
		</span>
	);
}

export function KeyboardShortcutsContent() {
	const grouped = shortcutsByCategory();
	const categories = () => [...grouped.keys()];

	return (
		<div class="flex-1 overflow-y-auto p-4 space-y-6">
			<For each={categories()}>
				{(category) => (
					<section>
						<h3 class="text-sm font-semibold text-neutral-400 mb-2">
							{category}
						</h3>
						<ul class="divide-y divide-neutral-800 rounded border border-neutral-800">
							<For each={grouped.get(category)!}>
								{(shortcut) => (
									<li class="flex items-start justify-between gap-4 px-3 py-2 text-sm">
										<span class="text-neutral-200">{shortcut.description}</span>
										<ShortcutKeys chords={shortcut.chords} />
									</li>
								)}
							</For>
						</ul>
					</section>
				)}
			</For>
		</div>
	);
}

export function KeyboardShortcutsDialog() {
	const [open, setOpen] = createSignal(false);

	const setOpenSynced = (value: boolean) => {
		setOpen(value);
		setKeyboardShortcutsOpen(value);
	};

	createEventListener(window, "keydown", (e) => {
		if (isEditingText(e)) return;
		if (e.key === "?" && e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
			e.preventDefault();
			setOpenSynced(!open());
		}
	});

	return (
		<Dialog onOpenChange={setOpenSynced} open={open()}>
			<DialogTrigger<typeof Button>
				as={(props) => (
					<Button
						size="icon"
						variant="ghost"
						title="Keyboard shortcuts (Shift+?)"
						{...props}
					/>
				)}
			>
				<IconTablerKeyboard class="size-6" />
			</DialogTrigger>
			<DialogContent class="max-h-[85vh] w-full max-w-2xl flex flex-col">
				<div class="p-4 border-b border-neutral-800 flex flex-row justify-between items-center shrink-0">
					<DialogTitle class="font-bold text-lg">Keyboard shortcuts</DialogTitle>
					<DialogCloseButton />
				</div>
				<KeyboardShortcutsContent />
			</DialogContent>
		</Dialog>
	);
}
