import { type Core, Package } from "@macrograph/runtime";
import { t } from "@macrograph/typesystem";

export function pkg(core: Core) {
	const pkg = new Package({ name: "HTTP Requests" });

	pkg.createSchema({
		name: "GET",
		type: "exec",
		createIO({ io }) {
			return {
				url: io.dataInput({
					id: "url",
					name: "URL",
					type: t.string(),
				}),
				response: io.dataOutput({
					id: "response",
					name: "Response",
					type: t.string(),
				}),
				status: io.dataOutput({
					id: "status",
					name: "Status",
					type: t.int(),
				}),
			};
		},
		async run({ ctx, io }) {
			const response = await core.fetch(ctx.getInput(io.url), {
				method: "GET",
			});

			// TODO: Change when Objects implemented
			ctx.setOutput(io.response, await response.text());
			ctx.setOutput(io.status, response.status);
		},
	});

	pkg.createSchema({
		name: "POST",
		type: "exec",
		createIO({ io }) {
			return {
				url: io.dataInput({
					id: "url",
					name: "URL",
					type: t.string(),
				}),
				body: io.dataInput({
					id: "body",
					name: "Body",
					type: t.string(),
				}),
				response: io.dataOutput({
					id: "response",
					name: "Response",
					type: t.string(),
				}),
				status: io.dataOutput({
					id: "status",
					name: "Status",
					type: t.int(),
				}),
			};
		},
		async run({ ctx, io }) {
			const response = await core.fetch(ctx.getInput(io.url), {
				method: "POST",
				body: JSON.stringify(ctx.getInput(io.body)),
				headers: {
					"content-type": "application/json; charset=UTF-8",
				},
			});

			// TODO: Change when Objects implemented
			ctx.setOutput(io.response, await response.text());
			ctx.setOutput(io.status, response.status);
		},
	});

	pkg.createSchema({
		name: "PUT",
		type: "exec",
		createIO({ io }) {
			return {
				url: io.dataInput({
					id: "url",
					name: "URL",
					type: t.string(),
				}),
				body: io.dataInput({
					id: "body",
					name: "Body",
					type: t.string(),
				}),
				response: io.dataOutput({
					id: "response",
					name: "Response",
					type: t.string(),
				}),
				status: io.dataOutput({
					id: "status",
					name: "Status",
					type: t.int(),
				}),
			};
		},
		async run({ ctx, io }) {
			const response = await core.fetch(ctx.getInput(io.url), {
				method: "PUT",
				body: JSON.stringify(ctx.getInput(io.body)),
				headers: {
					"content-type": "application/json; charset=UTF-8",
				},
			});

			// TODO: Change when Objects implemented
			ctx.setOutput(io.response, await response.text());
			ctx.setOutput(io.status, response.status);
		},
	});

	pkg.createSchema({
		name: "DELETE",
		type: "exec",
		createIO({ io }) {
			return {
				url: io.dataInput({
					id: "url",
					name: "URL",
					type: t.string(),
				}),
				response: io.dataOutput({
					id: "response",
					name: "Response",
					type: t.string(),
				}),
				status: io.dataOutput({
					id: "status",
					name: "Status",
					type: t.int(),
				}),
			};
		},
		async run({ ctx, io }) {
			const response = await core.fetch(ctx.getInput(io.url), {
				method: "DELETE",
			});

			// TODO: Change when Objects implemented
			ctx.setOutput(io.response, await response.text());
			ctx.setOutput(io.status, response.status);
		},
	});

	return pkg;
}
