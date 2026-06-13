import { None, Some, makePersistedOption } from "@macrograph/option";
import { type OnEvent } from "@macrograph/runtime";
import { createSignal, onCleanup, onMount } from "solid-js";
import type { Events } from "./index";

export type ConnectionState =
	| { type: "disconnected" }
	| { type: "connecting" }
	| { type: "connected"; connectionMethod: "websocket" }
	| { type: "error"; message: string };

export type Ctx = ReturnType<typeof createCtx>;

function getBridge() {
	const api =
		typeof window !== "undefined" ? (window as any).electronAPI : null;
	return api?.tiktok ?? null;
}

export function createCtx(onEvent: OnEvent<Events>) {
	const [channelName, setChannelName] = makePersistedOption<string>(
		createSignal(None),
		"tiktok-channel",
	);

	const [apiKey, setApiKey] = makePersistedOption<string>(
		createSignal(None),
		"tiktok-api-key",
	);

	const [state, setState] = createSignal<ConnectionState>({
		type: "disconnected",
	});

	let unlistenState: (() => void) | null = null;
	let unlistenData: (() => void) | null = null;

	async function connect() {
		const name = channelName();
		if (name.isNone()) return;

		const key = apiKey();
		if (key.isNone()) {
			setState({ type: "error", message: "Euler Stream API key is required" });
			return;
		}

		const bridge = getBridge();
		if (!bridge) {
			setState({ type: "error", message: "TikTok bridge not available" });
			return;
		}

		setState({ type: "connecting" });

		unlistenState?.();
		unlistenData?.();

		unlistenState = window.electronAPI.onEvent(
			"tiktok:event",
			([eventUsername, eventState]: [string, TikTokConnectionState]) => {
				if (eventUsername !== name.unwrap()) return;

				switch (eventState.status) {
					case "connected":
						setState({ type: "connected", connectionMethod: "websocket" });
						break;
					case "disconnected":
						setState({ type: "disconnected" });
						break;
					case "connecting":
						setState({ type: "connecting" });
						break;
					case "error":
						setState({
							type: "error",
							message: eventState.error ?? "Connection failed",
						});
						break;
				}
			},
		);

		unlistenData = window.electronAPI.onEvent(
			"tiktok:data",
			([eventUsername, eventName, data]: [
				string,
				string,
				Record<string, any>,
			]) => {
				if (eventUsername !== name.unwrap()) return;

				switch (eventName) {
					case "chat":
						onEvent({
							name: "chat",
							data: {
								user: data.uniqueId ?? data.user?.uniqueId ?? "",
								comment: data.comment ?? "",
							},
						});
						break;
					case "gift": {
						if (data.giftType === 1 && !data.repeatEnd) return;
						const ext = data.extendedGiftInfo;
						onEvent({
							name: "gift",
							data: {
								user: data.uniqueId ?? data.user?.uniqueId ?? "",
								giftName:
									ext?.name ??
									data.giftDetails?.giftName ??
									data.gift?.gift_name ??
									"Gift",
								diamonds: ext?.diamondCount ?? data.giftDetails?.diamondCount ?? data.gift?.diamond_count ?? data.diamondCount ?? 0,
								repeatCount: data.repeatCount ?? 1,
							},
						});
						break;
					}
					case "member":
						onEvent({
							name: "member",
							data: {
								user: data.uniqueId ?? data.user?.uniqueId ?? "",
							},
						});
						break;
					case "follow":
						onEvent({
							name: "follow",
							data: {
								user: data.uniqueId ?? data.user?.uniqueId ?? "",
							},
						});
						break;
					case "share":
						onEvent({
							name: "share",
							data: {
								user: data.uniqueId ?? data.user?.uniqueId ?? "",
							},
						});
						break;
					case "like":
						onEvent({
							name: "like",
							data: {
								user: data.uniqueId ?? data.user?.uniqueId ?? "",
								likeCount: data.likeCount ?? 1,
							},
						});
						break;
				}
			},
		);

		try {
			await bridge.connect(name.unwrap(), key.unwrap());
		} catch (err: any) {
			setState({
				type: "error",
				message: err.message ?? String(err),
			});
		}
	}

	async function disconnect() {
		const name = channelName();
		if (name.isNone()) return;

		const bridge = getBridge();
		if (bridge) {
			await bridge.disconnect(name.unwrap());
		}
		setState({ type: "disconnected" });
	}

	onMount(() => {
		if (channelName().isSome() && apiKey().isSome()) {
			connect();
		}
	});

	onCleanup(() => {
		unlistenState?.();
		unlistenData?.();
		const bridge = getBridge();
		if (bridge) bridge.disconnectAll();
	});

	return {
		channelName,
		setChannelName,
		apiKey,
		setApiKey,
		state,
		connect,
		disconnect,
	};
}
