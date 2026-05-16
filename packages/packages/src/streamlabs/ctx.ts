import { None, makePersistedOption } from "@macrograph/option";
import {
	getRemoteShellMode,
	type Core,
	type OAuthToken,
	type OnEvent,
} from "@macrograph/runtime";
import { type Socket, io } from "socket.io-client";
import {
	createEffect,
	createMemo,
	createResource,
	createSignal,
	on,
	onCleanup,
} from "solid-js";
import * as v from "valibot";

import type { Events } from ".";
import { createEndpoint } from "../httpEndpoint";
import { EVENT } from "./events";

export type Ctx = ReturnType<typeof createCtx>;

const TOKEN_LOCALSTORAGE = "streamlabsToken";
const USER_TOKEN_LOCALSTORAGE = "streamlabsUserToken";

export function createCtx(core: Core, onEvent: OnEvent<Events>) {
	const [state, setState] = createSignal<
		| {
				type: "disconnected";
		  }
		| { type: "connecting" }
		| {
				type: "connected";
				socket: Socket;
		  }
	>({ type: "disconnected" });

	const [token, setToken] = makePersistedOption<string>(
		createSignal(None),
		TOKEN_LOCALSTORAGE,
	);

	const [userToken, setUserToken] = makePersistedOption<OAuthToken>(
		createSignal(None),
		USER_TOKEN_LOCALSTORAGE,
	);

	const user = createMemo(() => {
		const token = userToken().toNullable();

		if (!token) return;

		const client = createEndpoint({
			path: "https://streamlabs.com/api/v2.0",
			fetch: async (url, opts) => {
				const resp = await core.fetch(url, {
					...opts,
					headers: {
						accept: "application/json",
						authorization: `Bearer ${token.access_token}`,
						...opts?.headers,
					},
				});

				const json = await resp.json();

				if (resp.status !== 200) throw new Error(json as any);

				return json;
			},
		});

		const api = {
			user: client.extend("/user"),
		};

		const [user] = createResource(async () => {
			const resp = await api.user.get(
				v.object({
					streamlabs: v.object({
						display_name: v.string(),
					}),
				}),
			);

			return resp;
		});

		return user();
	});

	createEffect(
		on(
			() => token(),
			(token) => {
				if (getRemoteShellMode()) {
					setState({ type: "disconnected" });
					return;
				}
				token.mapOrElse(
					() => {
						setState({ type: "disconnected" });
					},
					(token) => {
						const socket = io(`https://sockets.streamlabs.com?token=${token}`, {
							transports: ["websocket"],
							autoConnect: false,
						});

						socket.on("event", (eventData) => {
							const parsed = v.safeParse(EVENT, eventData);

							if (!parsed.success) return;

							if ("giftMembershipsCount" in parsed.output.message[0])
								onEvent({
									name: "membershipGiftStart",
									data: parsed.output.message[0],
								});
							else
								onEvent({
									name: parsed.output.type,
									data: parsed.output.message[0],
								});
						});

						socket.on("connect", () => {
							setState({ type: "connected", socket });
						});

						setState({
							type: "connecting",
							socket,
						});

						socket.connect();

						onCleanup(() => {
							socket.close();
							setState({ type: "disconnected" });
						});
					},
				);
			},
		),
	);

	const [streamlabsMirror, setStreamlabsMirror] = createSignal<{
		socketPhase: string;
		hasSocketToken: boolean;
		hasUserToken: boolean;
		oauthDisplayName: string | null;
	} | null>(null);

	return {
		core,
		streamlabsMirror,
		collectHostMirror() {
			let oauthDisplayName: string | null = null;
			try {
				const u = user() as
					| { streamlabs?: { display_name: string } }
					| undefined;
				oauthDisplayName = u?.streamlabs?.display_name ?? null;
			} catch {
				oauthDisplayName = null;
			}
			return {
				socketPhase: state().type,
				hasSocketToken: token().isSome(),
				hasUserToken: userToken().isSome(),
				oauthDisplayName,
			};
		},
		applyHostMirror(data: unknown) {
			if (!getRemoteShellMode()) return;
			if (!data || typeof data !== "object") {
				setStreamlabsMirror(null);
				return;
			}
			const d = data as {
				socketPhase?: string;
				hasSocketToken?: boolean;
				hasUserToken?: boolean;
				oauthDisplayName?: string | null;
			};
			setStreamlabsMirror({
				socketPhase: typeof d.socketPhase === "string" ? d.socketPhase : "disconnected",
				hasSocketToken: Boolean(d.hasSocketToken),
				hasUserToken: Boolean(d.hasUserToken),
				oauthDisplayName:
					typeof d.oauthDisplayName === "string" || d.oauthDisplayName === null
						? d.oauthDisplayName
						: null,
			});
		},
		clearHostMirror() {
			if (!getRemoteShellMode()) return;
			setStreamlabsMirror(null);
		},
		auth: {
			user,
			state,
			token,
			setToken,
			userToken,
			setUserToken,
		},
	};
}
