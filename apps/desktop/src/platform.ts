import type { Platform } from "@macrograph/interface";
import {
	exportInvocationLogForGraphs,
	importInvocationLogFromProject,
	loadParsedProject,
} from "@macrograph/interface";
import type { Core } from "@macrograph/runtime";
import {
	parseJsonWithContext,
	serde,
	serializeProject,
} from "@macrograph/runtime-serde";
import { ask, open, save } from "@tauri-apps/api/dialog";
import { readText, writeText } from "@tauri-apps/api/clipboard";
import { readTextFile, writeTextFile } from "@tauri-apps/api/fs";
import type { Accessor, Setter } from "solid-js";

export function createPlatform(props: {
	projectUrl: Accessor<string | null>;
	setProjectUrl: Setter<string | null>;
	core: Core;
}) {
	return {
		projectPersistence: {
			async saveProject(saveAs = false) {
				let url = !saveAs ? props.projectUrl() : null;

				if (url === null) {
					url = await save({
						defaultPath: "macrograph-project.json",
						filters: [{ name: "JSON", extensions: ["json"] }],
					});
				}

				if (url === null) return;

				const name = url.split("/").pop()?.split(".")[0];
				if (name) props.core.project.name = name;

				const graphIds = props.core.project.allGraphOrder as number[];
				const wk = (props.projectUrl() ?? url) as string;
				const nodeInvocations = await exportInvocationLogForGraphs(
					graphIds,
					wk,
				).catch(() => []);

				await writeTextFile(
					url,
					JSON.stringify(
						{
							...serializeProject(props.core.project),
							nodeInvocations,
						},
						null,
						4,
					),
				);

				props.setProjectUrl(url);
			},
			async loadProject() {
				if (await ask("Would you like to save this project?"))
					await this.saveProject();

				const url = await open({
					filters: [{ name: "JSON", extensions: ["json"] }],
					multiple: false,
				});

				if (typeof url !== "string") return;

				const data = await readTextFile(url);

				const serializedProject = parseJsonWithContext(
					"apps/desktop platform.loadProject: project file from disk",
					serde.Project,
					data,
				);

				const loaded = await loadParsedProject(
					props.core,
					serializedProject,
					{
						onAfterLoad: async (data) => {
							await importInvocationLogFromProject(
								data.nodeInvocations,
								url,
							).catch((e: unknown) =>
								console.error("import invocation log", e),
							);
						},
					},
				);

				if (!loaded) return;

				props.setProjectUrl(url);
			},
			get url() {
				return props.projectUrl();
			},
		},
		clipboard: {
			async readText() {
				return (await readText()) ?? "";
			},
			async writeText(text: string) {
				await writeText(text);
			},
		},
	} satisfies Platform;
}
