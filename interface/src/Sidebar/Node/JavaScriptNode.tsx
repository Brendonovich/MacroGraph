import {
	type IoDefinition,
	type IoFieldDef,
	ioDefinitionForNode,
} from "@macrograph/packages/src/script";
import { scriptLog } from "@macrograph/packages/src/scriptDebug";
import {
	defaultScriptIoFieldType,
	normalizeScriptIoType,
} from "@macrograph/packages/src/scriptIoTypes";
import { graphRefOf, type Node } from "@macrograph/runtime";
import { Button } from "@macrograph/ui";
import { createMemo, createSignal, Show } from "solid-js";

import { SidebarSection } from "../../components/Sidebar";
import { useInterfaceContext } from "../../context";
import { FieldList } from "./JavaScriptFieldList";
import { JavaScriptCodeEditorModal } from "./JavaScriptCodeEditorModal";

function nextFieldId(fields: IoFieldDef[]) {
	const nums = fields
		.map((f) => Number.parseInt(f.id, 10))
		.filter((n) => !Number.isNaN(n));
	const next = nums.length > 0 ? Math.max(...nums) + 1 : fields.length;
	return String(next);
}

function codePreview(code: string, maxLines = 4) {
	const lines = code.split("\n");
	if (lines.length <= maxLines) return code;
	return `${lines.slice(0, maxLines).join("\n")}\n…`;
}

export function JavaScriptNode(props: { node: Node }) {
	const ctx = useInterfaceContext();
	const [editorOpen, setEditorOpen] = createSignal(false);

	const ioDefinition = createMemo(() => {
		const def = ioDefinitionForNode(props.node);
		scriptLog("JavaScriptNode ioDefinition memo", def);
		return def;
	});

	const code = createMemo(
		() => (props.node.state.properties.code as string | undefined) ?? "",
	);

	const saveIoDefinition = (def: IoDefinition) => {
		ctx.execute("setNodeProperty", {
			...graphRefOf(props.node.graph),
			nodeId: props.node.id,
			propertyId: "ioDefinition",
			value: JSON.stringify(def),
		});
	};

	const saveCode = (value: string) => {
		ctx.execute("setNodeProperty", {
			...graphRefOf(props.node.graph),
			nodeId: props.node.id,
			propertyId: "code",
			value,
		});
	};

	const updateField = (
		kind: "inputs" | "outputs",
		id: string,
		patch: Partial<Pick<IoFieldDef, "name" | "type">>,
	) => {
		const def = structuredClone(ioDefinition());
		const list = def[kind];
		const idx = list.findIndex((f) => f.id === id);
		if (idx < 0) return;
		list[idx] = { ...list[idx]!, ...patch };
		saveIoDefinition(def);
	};

	return (
		<>
			<FieldList
				title="Inputs"
				items={ioDefinition().inputs}
				onAdd={() => {
					const def = structuredClone(ioDefinition());
					const id = nextFieldId(def.inputs);
					def.inputs.push({
						id,
						name: `Input ${id}`,
						type: defaultScriptIoFieldType(),
					});
					saveIoDefinition(def);
				}}
				onDelete={(id) => {
					const def = structuredClone(ioDefinition());
					def.inputs = def.inputs.filter((f) => f.id !== id);
					saveIoDefinition(def);
				}}
				onRename={(id, name) => updateField("inputs", id, { name })}
				onTypeChange={(id, type) =>
					updateField("inputs", id, {
						type: normalizeScriptIoType(type).serialize(),
					})
				}
			/>
			<FieldList
				title="Outputs"
				items={ioDefinition().outputs}
				onAdd={() => {
					const def = structuredClone(ioDefinition());
					const id = nextFieldId(def.outputs);
					def.outputs.push({
						id,
						name: `Output ${id}`,
						type: defaultScriptIoFieldType(),
					});
					saveIoDefinition(def);
				}}
				onDelete={(id) => {
					const def = structuredClone(ioDefinition());
					def.outputs = def.outputs.filter((f) => f.id !== id);
					saveIoDefinition(def);
				}}
				onRename={(id, name) => updateField("outputs", id, { name })}
				onTypeChange={(id, type) =>
					updateField("outputs", id, {
						type: normalizeScriptIoType(type).serialize(),
					})
				}
			/>

			<SidebarSection title="Code">
				<div class="p-2 space-y-2">
					<Button
						type="button"
						class="w-full"
						onClick={() => setEditorOpen(true)}
					>
						Edit code
					</Button>
					<Show when={code().trim()}>
						<pre class="text-xs font-mono text-neutral-400 bg-black/40 rounded p-2 max-h-24 overflow-hidden whitespace-pre-wrap">
							{codePreview(code())}
						</pre>
					</Show>
					<Show when={!code().trim()}>
						<p class="text-xs text-neutral-500">No script yet.</p>
					</Show>
				</div>
			</SidebarSection>

			<Show when={editorOpen()}>
				<JavaScriptCodeEditorModal
					open={editorOpen()}
					onOpenChange={setEditorOpen}
					initialCode={code()}
					ioDefinition={ioDefinition()}
					getType={ctx.core.project.getType.bind(ctx.core.project)}
					onSave={saveCode}
				/>
			</Show>
		</>
	);
}
