import { Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { readTextFile, writeTextFile } from "@tauri-apps/api/fs";

type Entry = { Dir: string } | { File: string };

export function register(actions: { list(path: string): Promise<Entry[]> }) {
	const pkg = new Package({ name: "FS" });

	pkg.createSchema({
		name: "List Files",
		type: "exec",
		createIO({ io }) {
			return {
				path: io.dataInput({
					id: "path",
					name: "Folder Path",
					type: t.string(),
				}),
				files: io.dataOutput({
					id: "files",
					name: "Files",
					type: t.list(t.string()),
				}),
			};
		},
		async run({ ctx, io }) {
			const files = await actions.list(ctx.getInput(io.path));

			const array = files
				.map((f) => {
					if ("File" in f) return f.File;
				})
				.filter(Boolean) as string[];

			ctx.setOutput(io.files, array);
		},
	});

	pkg.createSchema({
		name: "List Folders",
		type: "exec",
		createIO({ io }) {
			return {
				path: io.dataInput({
					id: "path",
					name: "Folder Path",
					type: t.string(),
				}),
				files: io.dataOutput({
					id: "folders",
					name: "Folders",
					type: t.list(t.string()),
				}),
			};
		},
		async run({ ctx, io }) {
			const files = await actions.list(ctx.getInput(io.path));

			const array = files
				.map((f) => {
					if ("Dir" in f) return f.Dir;
				})
				.filter(Boolean) as string[];

			ctx.setOutput(io.files, array);
		},
	});

	pkg.createSchema({
		name: "Read Text File",
		type: "exec",
		createIO({ io }) {
			return {
				file: io.dataInput({
					id: "file",
					name: "File Location",
					type: t.string(),
				}),
				textOut: io.dataOutput({
					id: "textOut",
					name: "File Contents",
					type: t.string(),
				}),
			};
		},
		async run({ ctx, io }) {
			const filePath = ctx.getInput(io.file);

			try {
				// If it's a local file path, use Tauri's readTextFile
				const content = await readTextFile(filePath);
				ctx.setOutput(io.textOut, content);
			} catch (err) {
				console.error("Failed to read file:", err);
				ctx.setOutput(io.textOut, `Error: Could not read file at ${filePath}`);
			}
		},
	});

	pkg.createSchema({
		name: "Write Text File",
		type: "exec",
		createIO({ io }) {
			return {
				file: io.dataInput({
					id: "file",
					name: "File Location",
					type: t.string(),
				}),
				text: io.dataInput({
					id: "text",
					name: "Text to Write",
					type: t.string(),
				}),
				success: io.dataOutput({
					id: "success",
					name: "Success",
					type: t.bool(),
				}),
			};
		},
		async run({ ctx, io }) {
			const filePath = ctx.getInput(io.file);
			const textToWrite = ctx.getInput(io.text);

			try {
				await writeTextFile(filePath, textToWrite);
				ctx.setOutput(io.success, true);
			} catch (err) {
				console.error("Failed to write file:", err);
				ctx.setOutput(io.success, false);
			}
		},
	});

	return pkg;
}
