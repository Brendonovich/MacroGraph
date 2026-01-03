import { Maybe } from "@macrograph/option";
import { t } from "@macrograph/typesystem";
import type { ChatCompletionAssistantMessageParam } from "openai/resources";

import type { Pkg } from ".";
import type { Ctx } from "./ctx";

export function register(pkg: Pkg, state: Ctx) {
	const Model = pkg.createEnum("ChatGPT Model", (e) => [
		e.variant("gpt-3.5-turbo"),
		e.variant("gpt-4"),
	]);

	pkg.createSchema({
		name: "ChatGPT Message",
		type: "base",
		createIO({ io }) {
			return {
				exec: io.execInput({ id: "exec" }),
				message: io.dataInput({
					id: "message",
					name: "Message",
					type: t.string(),
				}),
				model: io.dataInput({
					id: "model",
					name: "Model",
					type: t.enum(Model),
				}),
				historyIn: io.dataInput({
					id: "historyIn",
					name: "Chat History",
					type: t.list(t.map(t.string())),
				}),
				stream: io.scopeOutput({
					id: "stream",
					name: "Stream",
					scope: (s) => {
						s.output({
							id: "stream",
							name: "Response Stream",
							type: t.string(),
						});
					},
				}),
				complete: io.scopeOutput({
					id: "complete",
					name: "Completed",
					scope: (s) => {
						s.output({ id: "response", name: "Response", type: t.string() });
					},
				}),
			};
		},
		async run({ ctx, io }) {
			const history = ctx.getInput(io.historyIn);

			const array = history.map(
				(item) =>
					({
						role: item.get("role"),
						content: item.get("content"),
					}) as ChatCompletionAssistantMessageParam,
			);

			let message = "";
			const stream = await state
				.state()
				.unwrap()
				.chat.completions.create({
					messages: [
						...array,
						{ role: "user", content: ctx.getInput(io.message) },
					],
					model: ctx.getInput(io.model).variant,
					stream: true,
				});

			for await (const chunk of stream) {
				console.log(chunk);
				if (chunk.choices[0]?.finish_reason === "stop") {
					const _array = [];

					ctx.execScope(io.complete, { response: message });
					return;
				}
				message += chunk.choices[0]?.delta.content;
				ctx.execScope(io.stream, { stream: message });
			}
		},
	});

	pkg.createSchema({
		name: "Dall E Image Generation",
		type: "exec",
		createIO({ io }) {
			return {
				prompt: io.dataInput({
					id: "prompt",
					name: "Prompt",
					type: t.string(),
				}),
				url: io.dataOutput({ id: "url", name: "Image URL", type: t.string() }),
				revised: io.dataOutput({
					id: "revised",
					name: "Revised Prompt",
					type: t.option(t.string()),
				}),
			};
		},
		async run({ ctx, io }) {
			const stream = await state
				.state()
				.unwrap()
				.images.generate({
					model: "dall-e-3",
					prompt: ctx.getInput(io.prompt),
					response_format: "url",
					size: "1024x1024",
					style: "vivid",
				});

			const image = stream.data[0];
			if (!image) return;

			ctx.setOutput(io.url, image.url!);
			ctx.setOutput(io.revised, Maybe(image.revised_prompt));
		},
	});
}
