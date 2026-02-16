import { Rpc, RpcGroup } from "@effect/rpc";
import { Effect, Schema } from "effect";
import { Credential, Package, ProjectEvent } from "@macrograph/project-domain";

import { CloudApiClient } from "./CloudApi";
import { CredentialsStore } from "./CredentialsStore";
import { ProjectRuntime } from "./ProjectRuntime";

export const EngineHostCredentials = Schema.Array(
	Schema.Struct({
		provider: Schema.String,
		id: Schema.String,
		displayName: Schema.String,
		token: Schema.Struct({
			access_token: Schema.String,
			refresh_token: Schema.optional(Schema.String),
			expires_in: Schema.Number,
		}),
	}),
);

export const RuntimeHostRpcs = RpcGroup.make(
	Rpc.make("GetCredentials", {
		success: EngineHostCredentials,
		error: Credential.FetchFailed,
	}),
	Rpc.make("RefreshCredential", {
		payload: Schema.Struct({ provider: Schema.String, id: Schema.String }),
		success: Schema.Void,
		error: Credential.FetchFailed,
	}),
	Rpc.make("DirtyState", {
		payload: Schema.Struct({ package: Package.Id }),
		success: Schema.Void,
		error: Schema.Never,
	}),
	Rpc.make("EmitEvent", {
		payload: Schema.Struct({ package: Package.Id, event: Schema.Unknown }),
		success: Schema.Void,
		error: Schema.Never,
	}),
);

export const RuntimeHostRpcsLive = RuntimeHostRpcs.toLayer(
	Effect.gen(function* () {
		const credentials = yield* CredentialsStore;
		const cloud = yield* CloudApiClient.CloudApiClient;
		const runtime = yield* ProjectRuntime.ProjectRuntime;

		return {
			GetCredentials: () =>
				credentials.get.pipe(
					Effect.map(
						(
							all: ReadonlyArray<{
								provider: string;
								id: string;
								displayName: string | null;
								token: {
									access_token: string;
									refresh_token?: string;
									expires_in: number;
								};
							}>,
						) =>
							all.map((c) => ({
								provider: c.provider,
								id: c.id,
								displayName: c.displayName ?? c.id,
								token: {
									access_token: c.token.access_token,
									refresh_token: c.token.refresh_token,
									expires_in: c.token.expires_in,
								},
							})),
					),
					Effect.catchAll(() => new Credential.FetchFailed()),
				),
			RefreshCredential: ({ provider, id }) =>
				cloud
					.refreshCredential({
						path: { providerId: provider, providerUserId: id },
					})
					.pipe(
						Effect.catchAll(() => new Credential.FetchFailed()),
						Effect.zipRight(
							credentials.refresh.pipe(
								Effect.catchAll(() => new Credential.FetchFailed()),
							),
						),
						Effect.asVoid,
					),
			DirtyState: ({ package: pkg }) =>
				runtime
					.publishEvent(new ProjectEvent.PackageStateChanged({ pkg }))
					.pipe(Effect.asVoid),
			EmitEvent: ({ package: pkg, event }) =>
				ProjectRuntime.handleEvent(pkg, event).pipe(Effect.asVoid),
		};
	}),
);
