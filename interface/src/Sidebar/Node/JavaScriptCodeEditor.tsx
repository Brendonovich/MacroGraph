import {
	completionsForContext,
	getScriptCompletionContext,
	getScriptTsCompletions,
	type IoDefinition,
} from "@macrograph/packages/src/script";
import type { ScriptGetTypeFn } from "@macrograph/packages/src/scriptTsCodegen";
import {
	scriptHasErrors,
	validateScriptSource,
	type ScriptDiagnostic,
} from "@macrograph/packages/src/scriptTsValidate";
import { autocompletion, type CompletionContext } from "@codemirror/autocomplete";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { bracketMatching, indentOnInput } from "@codemirror/language";
import { forceLinting, linter, type Diagnostic } from "@codemirror/lint";
import { EditorState, type Extension } from "@codemirror/state";
import {
	EditorView,
	highlightActiveLine,
	highlightActiveLineGutter,
	keymap,
	lineNumbers,
	placeholder,
} from "@codemirror/view";
import { createEffect, on, onCleanup, onMount } from "solid-js";

const mgTheme = EditorView.theme({
	"&": {
		height: "100%",
		fontSize: "13px",
		backgroundColor: "#171717",
		color: "#e5e5e5",
	},
	".cm-scroller": { fontFamily: "ui-monospace, monospace" },
	".cm-gutters": {
		backgroundColor: "#0a0a0a",
		color: "#737373",
		border: "none",
	},
	".cm-activeLineGutter": { backgroundColor: "#171717" },
	".cm-activeLine": { backgroundColor: "#262626" },
	"&.cm-focused .cm-cursor": { borderLeftColor: "#22d3ee" },
	"& .cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
		backgroundColor: "#164e63 !important",
	},
	".cm-tooltip-autocomplete": {
		backgroundColor: "#262626",
		border: "1px solid #404040",
	},
});

function lineColToOffset(doc: string, line: number, column: number) {
	const lines = doc.split("\n");
	let offset = 0;
	for (let i = 0; i < line - 1 && i < lines.length; i++) {
		offset += lines[i]!.length + 1;
	}
	return offset + Math.max(0, column - 1);
}

function diagnosticsToCm(
	userCode: string,
	diags: ScriptDiagnostic[],
): Diagnostic[] {
	return diags.map((d) => {
		const from = lineColToOffset(userCode, d.line, d.column);
		const lineStart = userCode.lastIndexOf("\n", from - 1) + 1;
		const lineEnd = userCode.indexOf("\n", from);
		const to = lineEnd === -1 ? userCode.length : lineEnd;
		return {
			from: Math.max(lineStart, from),
			to: Math.max(from + 1, to),
			severity: d.severity,
			message: d.message,
		};
	});
}

function createIoCompletion(
	ioDefinition: () => IoDefinition,
	getType: () => ScriptGetTypeFn,
) {
	return autocompletion({
		activateOnTyping: (typing) => {
			if (typing.text.length !== 1) return false;
			return /[\w$]/.test(typing.text) || typing.text === ".";
		},
		override: [
			(context: CompletionContext) => {
				const code = context.state.doc.toString();
				const pos = context.pos;
				const def = ioDefinition();

				const tsResult = getScriptTsCompletions(code, pos, def, getType());
				if (tsResult?.items.length) {
					return {
						from: tsResult.from,
						to: tsResult.to,
						options: tsResult.items.map((item) => ({
							label: item.label,
							detail: item.detail,
							type: item.type,
							apply: item.insert,
						})),
					};
				}

				const member = getScriptCompletionContext(code, pos, def);
				if (!member) return null;

				const items = completionsForContext(member, def);

				return {
					from: member.replaceFrom,
					to: member.replaceTo,
					options: items.map((item) => ({
						label: item.label,
						detail: item.detail,
						type: item.type,
						apply: item.insert,
					})),
				};
			},
		],
	});
}

function createTsLinter(
	ioDefinition: () => IoDefinition,
	getType: () => ScriptGetTypeFn,
) {
	return linter(
		(view) => {
			const code = view.state.doc.toString();
			const def = ioDefinition();
			const diags = validateScriptSource(code, def, getType());
			return diagnosticsToCm(code, diags);
		},
		{ delay: 400 },
	);
}

/** Stop graph/window shortcuts from stealing keys while the editor is focused. */
const isolateKeysFromApp = EditorView.domEventHandlers({
	keydown: (e) => e.stopPropagation(),
	keyup: (e) => e.stopPropagation(),
	keypress: (e) => e.stopPropagation(),
});

export type JavaScriptCodeEditorHandle = {
	getValue(): string;
	validate(): ScriptDiagnostic[];
	hasErrors(): boolean;
	focus(): void;
};

export function createJavaScriptCodeEditor(args: {
	container: HTMLElement;
	initialCode: string;
	ioDefinition: () => IoDefinition;
	getType: () => ScriptGetTypeFn;
	onChange?: (code: string) => void;
}): {
	handle: JavaScriptCodeEditorHandle;
	destroy: () => void;
	refreshLint: () => void;
	view: EditorView;
} {
	const ioDefinition = args.ioDefinition;
	const getType = args.getType;

	const extensions: Extension[] = [
		lineNumbers(),
		highlightActiveLineGutter(),
		highlightActiveLine(),
		bracketMatching(),
		indentOnInput(),
		history(),
		javascript({ typescript: true, closeBrackets: false }),
		placeholder("// TypeScript — use inputs.* and outputs.*"),
		createIoCompletion(ioDefinition, getType),
		createTsLinter(ioDefinition, getType),
		keymap.of([...defaultKeymap, ...historyKeymap]),
		isolateKeysFromApp,
		mgTheme,
		EditorView.updateListener.of((update) => {
			if (update.docChanged) {
				args.onChange?.(update.state.doc.toString());
			}
		}),
	];

	const state = EditorState.create({
		doc: args.initialCode,
		extensions,
	});

	const view = new EditorView({
		state,
		parent: args.container,
	});

	requestAnimationFrame(() => view.focus());

	const handle: JavaScriptCodeEditorHandle = {
		getValue: () => view.state.doc.toString(),
		validate: () =>
			validateScriptSource(view.state.doc.toString(), ioDefinition(), getType()),
		hasErrors: () =>
			scriptHasErrors(
				validateScriptSource(
					view.state.doc.toString(),
					ioDefinition(),
					getType(),
				),
			),
		focus: () => view.focus(),
	};

	return {
		handle,
		view,
		destroy: () => view.destroy(),
		refreshLint: () => forceLinting(view),
	};
}

/** Solid wrapper mounting CodeMirror into a div. */
export function JavaScriptCodeEditor(props: {
	initialCode: string;
	ioDefinition: IoDefinition;
	getType: ScriptGetTypeFn;
	onChange?: (code: string) => void;
	onReady?: (handle: JavaScriptCodeEditorHandle) => void;
}) {
	let container!: HTMLDivElement;
	let editor: JavaScriptCodeEditorHandle | undefined;
	let destroyEditor: (() => void) | undefined;
	let refreshLint: (() => void) | undefined;
	let editorView: EditorView | undefined;

	onMount(() => {
		const created = createJavaScriptCodeEditor({
			container,
			initialCode: props.initialCode,
			ioDefinition: () => props.ioDefinition,
			getType: () => props.getType,
			onChange: props.onChange,
		});
		editor = created.handle;
		destroyEditor = created.destroy;
		refreshLint = created.refreshLint;
		editorView = created.view;
		props.onReady?.(created.handle);
	});

	onCleanup(() => destroyEditor?.());

	createEffect(
		on(
			() => [props.ioDefinition, props.getType] as const,
			() => {
				if (editorView) forceLinting(editorView);
				else refreshLint?.();
			},
			{ defer: true },
		),
	);

	return (
		<div
			ref={container}
			class="h-full min-h-[20rem] w-full overflow-hidden rounded border border-neutral-700"
			onMouseDown={(e) => e.stopPropagation()}
		/>
	);
}
