import type { IoDefinition } from "@macrograph/packages/src/script";
import type { ScriptGetTypeFn } from "@macrograph/packages/src/scriptTsCodegen";
import {
	scriptHasErrors,
	validateScriptSource,
	type ScriptDiagnostic,
} from "@macrograph/packages/src/scriptTsValidate";
import {
	Button,
	Dialog,
	DialogCloseButton,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@macrograph/ui";
import { createSignal, For, Show } from "solid-js";

import {
	JavaScriptCodeEditor,
	type JavaScriptCodeEditorHandle,
} from "./JavaScriptCodeEditor";

export function JavaScriptCodeEditorModal(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialCode: string;
	ioDefinition: IoDefinition;
	getType: ScriptGetTypeFn;
	onSave: (code: string) => void;
}) {
	const [draft, setDraft] = createSignal(props.initialCode);
	const [saveErrors, setSaveErrors] = createSignal<ScriptDiagnostic[]>([]);
	let editor: JavaScriptCodeEditorHandle | undefined;

	const trySave = () => {
		const code = editor?.getValue() ?? draft();
		const diags =
			editor?.validate() ??
			validateScriptSource(
				code,
				props.ioDefinition,
				props.getType,
			);
		if (scriptHasErrors(diags)) {
			setSaveErrors(diags);
			return;
		}
		setSaveErrors([]);
		props.onSave(code);
		props.onOpenChange(false);
	};

	return (
		<Dialog
			open={props.open}
			onOpenChange={(open) => {
				if (!open) setSaveErrors([]);
				props.onOpenChange(open);
			}}
			modal
		>
			<DialogContent
				class="w-[min(92vw,56rem)] max-w-none h-[min(85vh,40rem)] flex flex-col gap-0 p-0 bg-neutral-900 border-neutral-700"
				onOpenAutoFocus={(e) => e.preventDefault()}
				onCloseAutoFocus={(e) => e.preventDefault()}
			>
				<DialogHeader class="flex flex-row items-center justify-between px-4 py-3 border-b border-neutral-700 shrink-0">
					<DialogTitle class="text-base text-neutral-100">
						Edit script
					</DialogTitle>
					<DialogCloseButton />
				</DialogHeader>

				<div class="flex-1 min-h-0 px-4 py-3 flex flex-col gap-2">
					<p class="text-xs text-neutral-400 shrink-0">
						TypeScript with typed <code class="text-cyan-400">inputs</code> and{" "}
						<code class="text-cyan-400">outputs</code>. Fix all errors before
						saving.
					</p>
					<div class="flex-1 min-h-0">
						<JavaScriptCodeEditor
							initialCode={props.initialCode}
							ioDefinition={props.ioDefinition}
							getType={props.getType}
							onChange={setDraft}
							onReady={(h) => {
								editor = h;
								requestAnimationFrame(() => h.focus());
							}}
						/>
					</div>

					<Show when={saveErrors().length > 0}>
						<div class="shrink-0 max-h-28 overflow-y-auto rounded border border-red-900/80 bg-red-950/40 p-2 text-xs text-red-200">
							<p class="font-medium mb-1">Fix these issues before saving:</p>
							<ul class="list-disc pl-4 space-y-0.5 font-mono">
								<For each={saveErrors()}>
									{(d) => (
										<li>
											Line {d.line}, col {d.column}: {d.message}
										</li>
									)}
								</For>
							</ul>
						</div>
					</Show>
				</div>

				<DialogFooter class="px-4 py-3 border-t border-neutral-700 shrink-0 gap-2 sm:justify-end">
					<Button
						type="button"
						variant="outline"
						onClick={() => props.onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button type="button" onClick={trySave}>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
