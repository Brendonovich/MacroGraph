import { JSONEnum, jsonToJS, jsToJSON } from "@macrograph/json";
import { Maybe, None } from "@macrograph/option";
import { type Core, Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";
import { ReactiveMap } from "@solid-primitives/map";
import { writeBinaryFile } from "@tauri-apps/api/fs";

export async function streamToArrayBuffer(
	stream: ReadableStream<Uint8Array>,
): Promise<Uint8Array> {
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

export function pkg(core: Core) {
	const pkg = new Package({ name: "HTTP Requests" });

	const BodyEnum = pkg.createEnum("Body", (e) => [
		e.variant("Plaintext", { value: t.string() }),
		e.variant("HTML", { value: t.string() }),
		e.variant("JSON", { value: t.enum(JSONEnum) }),
		e.variant("FormData", { value: t.map(t.string()) }),
	]);

	pkg.createSchema({
		name: "GET",
		type: "exec",
		createIO({ io }) {
			return {
				url: io.dataInput({ id: "url", name: "URL", type: t.string() }),
				headers: io.dataInput({
					id: "headers",
					name: "Headers",
					type: t.map(t.string()),
				}),
				responseBody: io.dataOutput({
					id: "responseBody",
					name: "Response Body",
					type: t.option(t.enum(BodyEnum)),
				}),
				status: io.dataOutput({
					id: "status",
					name: "Response Status",
					type: t.int(),
				}),
				responseHeaders: io.dataOutput({
					id: "responseHeaders",
					name: "Response Headers",
					type: t.map(t.string()),
				}),
			};
		},
		async run({ ctx, io }) {
			const headers: Record<string, string> = { ...ctx.getInput(io.headers) };
			const response = await core.fetch(ctx.getInput(io.url), {
				method: "GET",
				headers,
			});

			ctx.setOutput(
				io.responseBody,
				Maybe(
					await (async () => {
						switch (response.headers.get("Content-Type")!.split(";")[0]) {
							case "text/plain": {
								return BodyEnum.variant([
									"Plaintext",
									{ value: await response.text() },
								]);
							}
							case "text/html": {
								return BodyEnum.variant([
									"HTML",
									{ value: await response.text() },
								]);
							}
							case "application/json": {
								return BodyEnum.variant([
									"JSON",
									{ value: jsToJSON(await response.json())! },
								]);
							}
							case "multipart/form-data": {
								const formData = new ReactiveMap<string, string>();
								for (const entry of (await response.formData()).entries()) {
									formData.set(entry[0], entry[1].toString());
								}
								return BodyEnum.variant(["FormData", { value: formData }]);
							}
							default: {
								return null;
							}
						}
					})(),
				),
			);

			ctx.setOutput(io.status, response.status);
			ctx.setOutput(
				io.responseHeaders,
				new ReactiveMap<string, string>(response.headers.entries()),
			);
		},
	});

	pkg.createSchema({
		name: "GET File",
		type: "exec",
		createIO({ io }) {
			return {
				url: io.dataInput({ id: "url", name: "URL", type: t.string() }),
				path: io.dataInput({ id: "path", name: "File Path", type: t.string() }),
				headers: io.dataInput({
					id: "headers",
					name: "Headers",
					type: t.map(t.string()),
				}),
				responseBody: io.dataOutput({
					id: "responseBody",
					name: "Response Body",
					type: t.option(t.enum(BodyEnum)),
				}),
				status: io.dataOutput({
					id: "status",
					name: "Response Status",
					type: t.int(),
				}),
				responseHeaders: io.dataOutput({
					id: "responseHeaders",
					name: "Response Headers",
					type: t.map(t.string()),
				}),
			};
		},
		async run({ ctx, io }) {
			const headers: Record<string, string> = { ...ctx.getInput(io.headers) };
			const response = await core.fetch(ctx.getInput(io.url), {
				method: "GET",
				headers,
			});

			if (response.body && response.status === 200) {
				const data = await streamToArrayBuffer(response.body);
				console.log("array buffer created");
				writeBinaryFile(ctx.getInput(io.path), data);
				console.log("file written");
				ctx.setOutput(io.responseBody, None);
			} else {
				ctx.setOutput(
					io.responseBody,
					Maybe(
						await (async () => {
							switch (response.headers.get("Content-Type")) {
								case "text/plain": {
									return BodyEnum.variant([
										"Plaintext",
										{ value: await response.text() },
									]);
								}
								case "text/html": {
									return BodyEnum.variant([
										"HTML",
										{ value: await response.text() },
									]);
								}
								case "application/json": {
									return BodyEnum.variant([
										"JSON",
										{ value: jsToJSON(await response.json())! },
									]);
								}
								case "multipart/form-data": {
									const formData = new ReactiveMap<string, string>();
									for (const entry of (await response.formData()).entries()) {
										formData.set(entry[0], entry[1].toString());
									}
									return BodyEnum.variant(["FormData", { value: formData }]);
								}
								default: {
									return null;
								}
							}
						})(),
					),
				);
			}

			ctx.setOutput(io.status, response.status);
			ctx.setOutput(
				io.responseHeaders,
				new ReactiveMap<string, string>(response.headers.entries()),
			);
		},
	});

	pkg.createSchema({
		name: "POST",
		type: "exec",
		createIO({ io }) {
			return {
				url: io.dataInput({ id: "url", name: "URL", type: t.string() }),
				body: io.dataInput({
					id: "body",
					name: "Body",
					type: t.enum(BodyEnum),
				}),
				headers: io.dataInput({
					id: "headers",
					name: "Headers",
					type: t.map(t.string()),
				}),
				responseBody: io.dataOutput({
					id: "responseBody",
					name: "Response Body",
					type: t.option(t.enum(BodyEnum)),
				}),
				status: io.dataOutput({
					id: "status",
					name: "Response Status",
					type: t.int(),
				}),
				responseHeaders: io.dataOutput({
					id: "responseHeaders",
					name: "Response Headers",
					type: t.map(t.string()),
				}),
			};
		},
		async run({ ctx, io }) {
			const headers = new Headers();

			for (const [key, value] of Object.entries(ctx.getInput(io.headers))) {
				headers.set(key.toLowerCase(), value);
			}

			let type: string;
			let body: string | FormData | null = null;
			const input = ctx.getInput(io.body);
			switch (input.variant) {
				case "Plaintext": {
					type = "text/plain";
					body = input.data.value;
					break;
				}
				case "JSON": {
					type = "application/json";
					body = window.JSON.stringify(jsonToJS(input.data.value));
					break;
				}
				case "FormData": {
					type = "multipart/form-data";
					const fd = new FormData();
					input.data.value.forEach((value, key) => {
						fd.append(key, value);
					});

					body = fd;
					break;
				}
				case "HTML": {
					type = "text/html";
					body = input.data.value;
					break;
				}
			}

			if (type) {
				headers.set("content-type", type);
			}

			const response = await core.fetch(ctx.getInput(io.url), {
				method: "POST",
				body,
				headers,
			});

			ctx.setOutput(
				io.responseBody,
				Maybe(
					await (async () => {
						switch (response.headers.get("Content-Type")!.split(";")[0]) {
							case "text/plain": {
								return BodyEnum.variant([
									"Plaintext",
									{ value: await response.text() },
								]);
							}
							case "text/html": {
								return BodyEnum.variant([
									"HTML",
									{ value: await response.text() },
								]);
							}
							case "application/json": {
								return BodyEnum.variant([
									"JSON",
									{ value: jsToJSON(await response.json())! },
								]);
							}
							case "multipart/form-data": {
								const formData = new ReactiveMap<string, string>();
								for (const entry of (await response.formData()).entries()) {
									formData.set(entry[0], entry[1].toString());
								}
								return BodyEnum.variant(["FormData", { value: formData }]);
							}
							default: {
								return null;
							}
						}
					})(),
				),
			);

			ctx.setOutput(io.status, response.status);
			ctx.setOutput(
				io.responseHeaders,
				new ReactiveMap<string, string>(response.headers.entries()),
			);
		},
	});

	pkg.createSchema({
		name: "PUT",
		type: "exec",
		createIO({ io }) {
			return {
				url: io.dataInput({ id: "url", name: "URL", type: t.string() }),
				body: io.dataInput({
					id: "body",
					name: "Body",
					type: t.enum(BodyEnum),
				}),
				headers: io.dataInput({
					id: "headers",
					name: "Headers",
					type: t.map(t.string()),
				}),
				responseBody: io.dataOutput({
					id: "responseBody",
					name: "Response Body",
					type: t.option(t.enum(BodyEnum)),
				}),
				status: io.dataOutput({
					id: "status",
					name: "Response Status",
					type: t.int(),
				}),
				responseHeaders: io.dataOutput({
					id: "responseHeaders",
					name: "Response Headers",
					type: t.map(t.string()),
				}),
			};
		},
		async run({ ctx, io }) {
			const headers = new Headers();

			for (const [key, value] of Object.entries(ctx.getInput(io.headers))) {
				headers.set(key.toLowerCase(), value);
			}

			let type: string;
			let body: string | FormData | null;
			const input = ctx.getInput(io.body);
			switch (input.variant) {
				case "Plaintext": {
					type = "text/plain";
					body = input.data.value;
					break;
				}
				case "JSON": {
					type = "application/json";
					body = window.JSON.stringify(jsonToJS(input.data.value));
					break;
				}
				case "FormData": {
					type = "multipart/form-data";
					const fd = new FormData();
					input.data.value.forEach((value, key) => {
						fd.append(key, value);
					});

					body = fd;
					break;
				}
				case "HTML": {
					type = "text/html";
					body = input.data.value;
					break;
				}
			}

			headers.set("content-type", type);

			const response = await core.fetch(ctx.getInput(io.url), {
				method: "PUT",
				body,
				headers,
			});

			ctx.setOutput(
				io.responseBody,
				Maybe(
					await (async () => {
						switch (response.headers.get("Content-Type")!.split(";")[0]) {
							case "text/plain": {
								return BodyEnum.variant([
									"Plaintext",
									{ value: await response.text() },
								]);
							}
							case "text/html": {
								return BodyEnum.variant([
									"HTML",
									{ value: await response.text() },
								]);
							}
							case "application/json": {
								return BodyEnum.variant([
									"JSON",
									{ value: jsToJSON(await response.json())! },
								]);
							}
							case "multipart/form-data": {
								const formData = new ReactiveMap<string, string>();
								for (const entry of (await response.formData()).entries()) {
									formData.set(entry[0], entry[1].toString());
								}
								return BodyEnum.variant(["FormData", { value: formData }]);
							}
							default: {
								return null;
							}
						}
					})(),
				),
			);

			ctx.setOutput(io.status, response.status);
			ctx.setOutput(
				io.responseHeaders,
				new ReactiveMap<string, string>(response.headers.entries()),
			);
		},
	});

	pkg.createSchema({
		name: "DELETE",
		type: "exec",
		createIO({ io }) {
			return {
				url: io.dataInput({ id: "url", name: "URL", type: t.string() }),
				headers: io.dataInput({
					id: "headers",
					name: "Headers",
					type: t.map(t.string()),
				}),
				status: io.dataOutput({
					id: "status",
					name: "Response Status",
					type: t.int(),
				}),
				responseHeaders: io.dataOutput({
					id: "responseHeaders",
					name: "Response Headers",
					type: t.map(t.string()),
				}),
			};
		},
		async run({ ctx, io }) {
			const headers: Record<string, string> = { ...ctx.getInput(io.headers) };
			const response = await core.fetch(ctx.getInput(io.url), {
				method: "DELETE",
				headers,
			});

			ctx.setOutput(io.status, response.status);
			ctx.setOutput(
				io.responseHeaders,
				new ReactiveMap<string, string>(response.headers.entries()),
			);
		},
	});

	pkg.createSchema({
		name: "URL Encode Component",
		type: "pure",
		createIO({ io }) {
			return {
				input: io.dataInput({ id: "input", type: t.string() }),
				output: io.dataOutput({ id: "output", type: t.string() }),
			};
		},
		run({ ctx, io }) {
			ctx.setOutput(io.output, encodeURIComponent(ctx.getInput(io.input)));
		},
	});

	pkg.createSchema({
		name: "URL Decode Component",
		type: "pure",
		createIO({ io }) {
			return {
				input: io.dataInput({ id: "input", type: t.string() }),
				output: io.dataOutput({ id: "output", type: t.string() }),
			};
		},
		run({ ctx, io }) {
			ctx.setOutput(io.output, decodeURIComponent(ctx.getInput(io.input)));
		},
	});

	return pkg;
}
