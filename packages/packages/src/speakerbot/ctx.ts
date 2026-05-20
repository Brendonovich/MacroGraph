import { None, makePersistedOption } from "@macrograph/option";
import { getRemoteShellMode } from "@macrograph/runtime";
import { createEffect, createSignal, on, onCleanup } from "solid-js";

const SPEAKER_BOT_PORT = "SpeakerBotPort";

export type Ctx = ReturnType<typeof createCtx>;

export function createCtx() {
	const [state, setState] = createSignal<
		| {
				type: "disconnected";
		  }
		| { type: "connecting" | "connected"; ws: WebSocket }
	>({ type: "disconnected" });

	const [url, setUrl] = makePersistedOption<string>(
		createSignal(None),
		SPEAKER_BOT_PORT,
	);

	const [hostMirrorSpeakerbot, setHostMirrorSpeakerbot] = createSignal<{
		url: string | null;
		uiState: "disconnected" | "connecting" | "connected";
	} | null>(null);

	createEffect(
		on(
			() => url(),
			(url) => {
				if (getRemoteShellMode()) return;
				url.map((url) => {
					const ws = new WebSocket(url);

					ws.addEventListener("open", () => {
						setState({ type: "connected", ws });
					});

					ws.addEventListener("message", () => {});

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
		url,
		setUrl,
		state,
		setState,
		hostMirrorSpeakerbot,
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
				setHostMirrorSpeakerbot(null);
				return;
			}
			const d = data as { url?: string | null; uiState?: string };
			const ui =
				d.uiState === "connecting" || d.uiState === "connected"
					? d.uiState
					: "disconnected";
			setHostMirrorSpeakerbot({
				url: typeof d.url === "string" ? d.url : null,
				uiState: ui,
			});
		},
		clearHostMirror() {
			if (!getRemoteShellMode()) return;
			setHostMirrorSpeakerbot(null);
		},
	};
}
