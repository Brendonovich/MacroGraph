import {
	type IoDefinition,
	type IoFieldDef,
	parseScriptResource,
	serializeScriptResource,
	ScriptResource,
} from "@macrograph/packages/src/script";
import {
	defaultScriptIoFieldType,
	normalizeScriptIoType,
} from "@macrograph/packages/src/scriptIoTypes";
import type { ResourceType } from "@macrograph/runtime";
import { Button } from "@macrograph/ui";
import { createMemo, createSignal, Show } from "solid-js";

import { SidebarSection } from "../../components/Sidebar";
import { useInterfaceContext } from "../../context";
import { FieldList } from "../Node/JavaScriptFieldList";
import { JavaScriptCodeEditorModal } from "../Node/JavaScriptCodeEditorModal";

function nextFieldId(fields: IoFieldDef[]) {
	const nums = fields
		.map((f) => Number.parseInt(f.id, 10))
		.filter((n) => !Number.isNaN(n));
	const next = nums.length > 0 ? Math.max(...nums) + 1 : fields.length;
	return String(next);
}

const CODE_LINE_REM = 1.25;
const CODE_SCROLL_AFTER = 8;

export function ScriptResourceEditor(props: {
	resourceId: number;
	resourceType?: ResourceType<string, any>;
}) {
	const ctx = useInterfaceContext();
	const resourceType = () => props.resourceType ?? ScriptResource;
	const [editorOpen, setEditorOpen] = createSignal(false);

	const item = createMemo(() => {
		const entry = ctx.core.project.resources.get(resourceType());
		return entry?.items.find((i) => i.id === props.resourceId);
	});

	const data = createMemo(() => {
		const value = item();
		if (!value || !("value" in value)) {
			return parseScriptResource(undefined);
		}
		return parseScriptResource(value.value);
	});

	const save = (next: { code?: string; ioDefinition?: IoDefinition }) => {
		const itemValue = item();
		if (!itemValue || !("value" in itemValue)) return;

		const merged = {
			code: next.code ?? data().code,
			ioDefinition: next.ioDefinition ?? data().ioDefinition,
		};

		ctx.execute("setResourceValue", {
			type: resourceType(),
			resourceId: props.resourceId,
			value: serializeScriptResource(merged),
		});
	};

	const updateField = (
		kind: "inputs" | "outputs",
		id: string,
		patch: Partial<Pick<IoFieldDef, "name" | "type">>,
	) => {
		const def = structuredClone(data().ioDefinition);
		const list = def[kind];
		const idx = list.findIndex((f) => f.id === id);
		if (idx < 0) return;
		list[idx] = { ...list[idx]!, ...patch };
		save({ ioDefinition: def });
	};

	const codeLineCount = createMemo(() => {
		const trimmed = data().code.trim();
		if (!trimmed) return 0;
		return data().code.split("\n").length;
	});

	return (
		<div class="space-y-1">
			<FieldList
				fitContent
				title="Inputs"
				items={data().ioDefinition.inputs}
				onAdd={() => {
					const def = structuredClone(data().ioDefinition);
					const id = nextFieldId(def.inputs);
					def.inputs.push({
						id,
						name: `Input ${id}`,
						type: defaultScriptIoFieldType(),
					});
					save({ ioDefinition: def });
				}}
				onDelete={(id) => {
					const def = structuredClone(data().ioDefinition);
					def.inputs = def.inputs.filter((f) => f.id !== id);
					save({ ioDefinition: def });
				}}
				onRename={(id, name) => updateField("inputs", id, { name })}
				onTypeChange={(id, type) =>
					updateField("inputs", id, {
						type: normalizeScriptIoType(type).serialize(),
					})
				}
			/>
			<FieldList
				fitContent
				title="Outputs"
				items={data().ioDefinition.outputs}
				onAdd={() => {
					const def = structuredClone(data().ioDefinition);
					const id = nextFieldId(def.outputs);
					def.outputs.push({
						id,
						name: `Output ${id}`,
						type: defaultScriptIoFieldType(),
					});
					save({ ioDefinition: def });
				}}
				onDelete={(id) => {
					const def = structuredClone(data().ioDefinition);
					def.outputs = def.outputs.filter((f) => f.id !== id);
					save({ ioDefinition: def });
				}}
				onRename={(id, name) => updateField("outputs", id, { name })}
				onTypeChange={(id, type) =>
					updateField("outputs", id, {
						type: normalizeScriptIoType(type).serialize(),
					})
				}
			/>

			<SidebarSection title="Code" fitContent>
				<div class="p-2 space-y-1.5">
					<Button
						type="button"
						class="w-full"
						onClick={() => setEditorOpen(true)}
					>
						Edit code
					</Button>
					<Show
						when={codeLineCount() > 0}
						fallback={<p class="text-xs text-neutral-500 px-0.5">No script yet.</p>}
					>
						<pre
							class="text-xs font-mono text-neutral-400 bg-black/40 rounded p-2 overflow-y-auto whitespace-pre-wrap"
							style={{
								"max-height": `${Math.min(codeLineCount(), CODE_SCROLL_AFTER) * CODE_LINE_REM + 1}rem`,
							}}
						>
							{data().code}
						</pre>
					</Show>
				</div>
			</SidebarSection>

			<Show when={editorOpen()}>
				<JavaScriptCodeEditorModal
					open={editorOpen()}
					onOpenChange={setEditorOpen}
					initialCode={data().code}
					ioDefinition={data().ioDefinition}
					getType={ctx.core.project.getType.bind(ctx.core.project)}
					onSave={(code) => save({ code })}
				/>
			</Show>
		</div>
	);
}
