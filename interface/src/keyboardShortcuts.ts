/** Internal key tokens; `mod` is Ctrl on Windows/Linux and ⌘ on macOS. */
export type KeyToken =
	| "mod"
	| "shift"
	| "alt"
	| "ctrl"
	| string;

export type KeyboardShortcut = {
	id: string;
	category: string;
	description: string;
	/** One or more key bindings (shown as alternatives when multiple). */
	chords: KeyToken[][];
};

export function isMacPlatform() {
	if (typeof navigator === "undefined") return false;
	return /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
}

const KEY_LABELS: Record<string, string> = {
	mod: "mod",
	shift: "Shift",
	alt: "Alt",
	ctrl: "Ctrl",
	enter: "Enter",
	escape: "Esc",
	tab: "Tab",
	backspace: "Backspace",
	delete: "Delete",
	pageup: "Page Up",
	pagedown: "Page Down",
	arrowleft: "←",
	arrowright: "→",
	arrowup: "↑",
	arrowdown: "↓",
	bracketleft: "[",
	bracketright: "]",
	backslash: "\\",
	num: "Num",
};

function tokenLabel(token: KeyToken): string {
	if (token === "mod") return isMacPlatform() ? "⌘" : "Ctrl";
	const lower = token.toLowerCase();
	if (KEY_LABELS[lower]) return KEY_LABELS[lower];
	if (/^digit\d$/.test(lower)) return lower.replace("digit", "");
	if (/^key[a-z]$/.test(lower)) return lower.replace("key", "").toUpperCase();
	if (lower === "click") return "click";
	if (lower === "scroll") return "scroll";
	return token;
}

export function formatChord(chord: KeyToken[]): string {
	return chord.map(tokenLabel).join(isMacPlatform() ? "" : " + ");
}

/** All editor shortcuts (display-only registry; handlers live elsewhere). */
export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
	{
		id: "undo",
		category: "Editing",
		description: "Undo",
		chords: [["mod", "Z"]],
	},
	{
		id: "redo",
		category: "Editing",
		description: "Redo",
		chords: [["mod", "shift", "Z"]],
	},
	{
		id: "copy",
		category: "Editing",
		description: "Copy selection to clipboard",
		chords: [["mod", "C"]],
	},
	{
		id: "paste",
		category: "Editing",
		description: "Paste from clipboard",
		chords: [["mod", "V"]],
	},
	{
		id: "delete",
		category: "Editing",
		description: "Delete selected nodes or comment boxes",
		chords: [["delete"], ["backspace"]],
	},
	{
		id: "delete-comment-box-only",
		category: "Editing",
		description: "Delete comment box without nodes inside",
		chords: [["mod", "delete"], ["mod", "backspace"]],
	},
	{
		id: "move-selection",
		category: "Editing",
		description: "Nudge selected items on the grid",
		chords: [["arrowleft"], ["arrowright"], ["arrowup"], ["arrowdown"]],
	},
	{
		id: "move-selection-large",
		category: "Editing",
		description: "Nudge selection by 10 grid steps",
		chords: [
			["shift", "arrowleft"],
			["shift", "arrowright"],
			["shift", "arrowup"],
			["shift", "arrowdown"],
		],
	},
	{
		id: "toggle-left-sidebar",
		category: "Panels",
		description: "Toggle left sidebar",
		chords: [["mod", "B"]],
	},
	{
		id: "toggle-right-sidebar",
		category: "Panels",
		description: "Toggle right sidebar",
		chords: [["mod", "E"]],
	},
	{
		id: "schema-menu",
		category: "Graph",
		description: "Open or close add-node menu at cursor",
		chords: [["mod", "shift", "K"]],
	},
	{
		id: "node-search",
		category: "Graph",
		description: "Search graphs and nodes",
		chords: [["mod", "shift", "F"]],
	},
	{
		id: "pin-assign",
		category: "Graph",
		description: "Start connection-assign mode on a pin",
		chords: [["mod", "click"]],
	},
	{
		id: "pin-drag-cancel",
		category: "Graph",
		description: "Cancel pin drag or assign mode",
		chords: [["escape"]],
	},
	{
		id: "fold-pins",
		category: "Graph",
		description: "Fold pins on selected nodes",
		chords: [["mod", "shift", "alt", "bracketleft"]],
	},
	{
		id: "unfold-pins",
		category: "Graph",
		description: "Unfold pins on selected nodes",
		chords: [["mod", "shift", "alt", "bracketright"]],
	},
	{
		id: "zoom",
		category: "Graph",
		description: "Zoom canvas",
		chords: [["mod", "scroll"]],
	},
	{
		id: "split-vertical",
		category: "Workspace",
		description: "Split focused pane vertically",
		chords: [["mod", "backslash"]],
	},
	{
		id: "split-horizontal",
		category: "Workspace",
		description: "Split focused pane horizontally",
		chords: [["mod", "shift", "backslash"]],
	},
	{
		id: "close-tab",
		category: "Workspace",
		description: "Close tab in focused pane",
		chords: [["mod", "W"]],
	},
	{
		id: "focus-adjacent-pane",
		category: "Workspace",
		description: "Focus previous / next pane",
		chords: [["mod", "pageup"], ["mod", "pagedown"]],
	},
	{
		id: "focus-pane-index",
		category: "Workspace",
		description: "Focus pane 1–9",
		chords: [["mod", "num"]],
	},
	{
		id: "schema-menu-nav",
		category: "Add-node menu",
		description: "Move selection",
		chords: [
			["tab"],
			["shift", "tab"],
			["arrowup"],
			["arrowdown"],
		],
	},
	{
		id: "schema-menu-select",
		category: "Add-node menu",
		description: "Place selected node",
		chords: [["enter"]],
	},
	{
		id: "schema-menu-search",
		category: "Add-node menu",
		description: "Focus search field",
		chords: [["mod", "F"]],
	},
	{
		id: "schema-menu-close",
		category: "Add-node menu",
		description: "Close menu",
		chords: [["escape"]],
	},
	{
		id: "search-dialog-nav",
		category: "Search dialog",
		description: "Move selection / confirm / close",
		chords: [["arrowup"], ["arrowdown"], ["enter"], ["escape"]],
	},
	{
		id: "shortcuts-help",
		category: "Help",
		description: "Open keyboard shortcuts",
		chords: [["shift", "?"]],
	},
];

export function shortcutsByCategory(): Map<string, KeyboardShortcut[]> {
	const map = new Map<string, KeyboardShortcut[]>();
	for (const shortcut of KEYBOARD_SHORTCUTS) {
		const list = map.get(shortcut.category) ?? [];
		list.push(shortcut);
		map.set(shortcut.category, list);
	}
	return map;
}
