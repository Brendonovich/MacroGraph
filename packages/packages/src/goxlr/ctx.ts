import { None, makePersistedOption } from "@macrograph/option";
import { getRemoteShellMode, type OnEvent } from "@macrograph/runtime";
import { parseJsonWithContext } from "@macrograph/runtime-serde";
import { createEffect, createSignal, on, onCleanup } from "solid-js";
import * as v from "valibot";

import type { Event } from ".";
import { WebSocketResponse } from "./types";

const URL_LOCALSTORAGE_KEY = "GoXLR_WS";

export type Ctx = ReturnType<typeof createCtx>;

export function createCtx(onEvent: OnEvent<Event>) {
	const [state, setState] = createSignal<
		| { type: "disconnected" }
		| { type: "connecting" | "connected"; ws: WebSocket }
	>({ type: "disconnected" });

	const [url, setUrl] = makePersistedOption<string>(
		createSignal(None),
		URL_LOCALSTORAGE_KEY,
	);

	const [hostMirrorGoxlr, setHostMirrorGoxlr] = createSignal<{
		url: string | null;
		uiState: "disconnected" | "connecting" | "connected";
	} | null>(null);

	let mixerID: string | undefined;

	createEffect(
		on(
			() => url(),
			(url) => {
				if (getRemoteShellMode()) return;
				url.map((url) => {
					const ws = new WebSocket(url);

					ws.addEventListener("open", () => {
						setState({ type: "connected", ws });
						ws.send(
							JSON.stringify({
								id: 0,
								data: "GetStatus",
							}),
						);
					});

					ws.addEventListener("message", (msg) => {
						const { data } = parseJsonWithContext(
							"packages/goxlr createCtx: WebSocket message (WebSocketResponse)",
							WebSocketResponse,
							msg.data as string,
						);
						if (data === "Ok") return;

						if ("Status" in data) {
							mixerID = Object.keys(data.Status.mixers)[0];
							return;
						}
						if ("Patch" in data) {
							for (const op of data.Patch) {
								const pathParts = op.path.substring(1).split("/");

								if (op.op !== "add" && op.op !== "replace") return;

								switch (pathParts[2]) {
									case "effects": {
										onEvent({
											name: "effects",
											data: {
												dial: pathParts[4],
												amount: Math.round(op.value),
											},
										});
										break;
									}
									case "levels": {
										onEvent({
											name: "levelsChange",
											data: {
												channel: pathParts[4]!,
												value: Math.round(op.value),
											},
										});
										break;
									}
									case "button_down": {
										onEvent({
											name: "buttonDown",
											data: { buttonName: pathParts[3]!, state: op.value },
										});
										break;
									}
									case "fader_status": {
										onEvent({
											name: "faderStatus",
											data: { channel: pathParts[3]!, state: op.value },
										});
										break;
									}
								}
							}
						}
					});

					setState({ type: "connecting", ws });

					onCleanup(() => {
						ws.close();
						setState({ type: "disconnected" });
					});
				});
			},
		),
	);

	return {
		mixerID: () => mixerID,
		url,
		setUrl,
		state,
		setState,
		hostMirrorGoxlr,
		collectHostMirror() {
			const u = url().toNullable();
			const st = state();
			const uiState: "disconnected" | "connecting" | "connected" =
				st.type === "disconnected"
					? "disconnected"
					: st.type === "connecting"
						? "connecting"
						: "connected";
			return { url: u ?? null, uiState };
		},
		applyHostMirror(data: unknown) {
			if (!getRemoteShellMode()) return;
			if (!data || typeof data !== "object") {
				setHostMirrorGoxlr(null);
				return;
			}
			const d = data as { url?: string | null; uiState?: string };
			const ui =
				d.uiState === "connecting" || d.uiState === "connected"
					? d.uiState
					: "disconnected";
			setHostMirrorGoxlr({
				url: typeof d.url === "string" ? d.url : null,
				uiState: ui,
			});
		},
		clearHostMirror() {
			if (!getRemoteShellMode()) return;
			setHostMirrorGoxlr(null);
		},
	};
}
