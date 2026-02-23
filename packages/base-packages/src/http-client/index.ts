import { HttpClient } from "@effect/platform";
import { Effect, pipe } from "effect";
import { Package, PackageEngine, t } from "@macrograph/package-sdk";

export class EngineDef extends PackageEngine.define({}) {}

export default Package.define({ name: "HTTP Client" })
	.addSchema("HttpGet", {
		type: "exec",
		name: "HTTP GET",
		description: "Makes an HTTP GET request to the specified URL.",
		io: (c) => ({
			in: { url: c.in.data("url", t.String, { name: "URL" }) },
			out: {
				status: c.out.data("status", t.Int, { name: "Status Code" }),
				// body: c.out.data("body", t.String, { name: "Response Body" }),
			},
		}),
		run: function* ({ io }) {
			const client = yield* HttpClient.HttpClient;

			const response = yield* pipe(
				client.get(io.in.url),
				Effect.flatMap((res) =>
					Effect.gen(function* () {
						const status = res.status;
						const body = yield* res.text;
						return { status, body };
					}),
				),
				Effect.orElseSucceed(() => ({ status: 0, body: "" })),
			);

			io.out.status(response.status);
			// io.out.body(response.body);
		},
	})
	.addSchema("HttpPost", {
		type: "exec",
		name: "HTTP POST",
		description: "Makes an HTTP POST request to the specified URL.",
		io: (c) => ({
			in: { url: c.in.data("url", t.String, { name: "URL" }) },
			out: {
				status: c.out.data("status", t.Int, { name: "Status Code" }),
				// body: c.out.data("body", t.String, { name: "Response Body" }),
			},
		}),
		run: function* ({ io }) {
			const client = yield* HttpClient.HttpClient;

			const response = yield* pipe(
				client.post(io.in.url),
				Effect.flatMap((res) =>
					Effect.gen(function* () {
						const status = res.status;
						const body = yield* res.text;
						return { status, body };
					}),
				),
				Effect.orElseSucceed(() => ({ status: 0, body: "" })),
			);

			io.out.status(response.status);
			// io.out.body(response.body);
		},
	})
	.addSchema("HttpPut", {
		type: "exec",
		name: "HTTP PUT",
		description: "Makes an HTTP PUT request to the specified URL.",
		io: (c) => ({
			in: { url: c.in.data("url", t.String, { name: "URL" }) },
			out: {
				status: c.out.data("status", t.Int, { name: "Status Code" }),
				// body: c.out.data("body", t.String, { name: "Response Body" }),
			},
		}),
		run: function* ({ io }) {
			const client = yield* HttpClient.HttpClient;

			const response = yield* pipe(
				client.put(io.in.url),
				Effect.flatMap((res) =>
					Effect.gen(function* () {
						const status = res.status;
						const body = yield* res.text;
						return { status, body };
					}),
				),
				Effect.orElseSucceed(() => ({ status: 0, body: "" })),
			);

			io.out.status(response.status);
			// io.out.body(response.body);
		},
	})
	.addSchema("HttpPatch", {
		type: "exec",
		name: "HTTP PATCH",
		description: "Makes an HTTP PATCH request to the specified URL.",
		io: (c) => ({
			in: { url: c.in.data("url", t.String, { name: "URL" }) },
			out: {
				status: c.out.data("status", t.Int, { name: "Status Code" }),
				// body: c.out.data("body", t.String, { name: "Response Body" }),
			},
		}),
		run: function* ({ io }) {
			const client = yield* HttpClient.HttpClient;

			const response = yield* pipe(
				client.patch(io.in.url),
				Effect.flatMap((res) =>
					Effect.gen(function* () {
						const status = res.status;
						const body = yield* res.text;
						return { status, body };
					}),
				),
				Effect.orElseSucceed(() => ({ status: 0, body: "" })),
			);

			io.out.status(response.status);
			// io.out.body(response.body);
		},
	})
	.addSchema("HttpDelete", {
		type: "exec",
		name: "HTTP DELETE",
		description: "Makes an HTTP DELETE request to the specified URL.",
		io: (c) => ({
			in: { url: c.in.data("url", t.String, { name: "URL" }) },
			out: {
				status: c.out.data("status", t.Int, { name: "Status Code" }),
				// body: c.out.data("body", t.String, { name: "Response Body" }),
			},
		}),
		run: function* ({ io }) {
			const client = yield* HttpClient.HttpClient;

			const response = yield* pipe(
				client.del(io.in.url),
				Effect.flatMap((res) =>
					Effect.gen(function* () {
						const status = res.status;
						const body = yield* res.text;
						return { status, body };
					}),
				),
				Effect.orElseSucceed(() => ({ status: 0, body: "" })),
			);

			io.out.status(response.status);
			// io.out.body(response.body);
		},
	});
