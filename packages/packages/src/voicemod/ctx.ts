import { getRemoteShellMode } from "@macrograph/runtime";
import { None, Some, type Option } from "@macrograph/option";
import { createSignal } from "solid-js";

export type Ctx = ReturnType<typeof createCtx>;

const PORTS = [
	59129, 20000, 39273, 42152, 43782, 46667, 35679, 37170, 38501, 33952, 30546,
];

const ENABLED_KEY = "voicemodEnabled";
const RETRY_MS = 30_000;

function readEnabled(): boolean {
	try {
		return localStorage.getItem(ENABLED_KEY) === "1";
	} catch {
		return false;
	}
}

export function createCtx() {
	const [enabled, setEnabledState] = createSignal(readEnabled());
	const [state, setState] = createSignal<Option<WebSocket>>(None);
	const [connecting, setConnecting] = createSignal(false);
	const [voices, setVoices] = createSignal<Map<string, string>>(new Map());
	const [voiceChanger, setVoiceChanger] = createSignal(false);
	const [hearVoice, setHearVoice] = createSignal(false);

	let connectGeneration = 0;
	let retryTimer: ReturnType<typeof setTimeout> | undefined;

	type Voice = {
		bitmapChecksum: string;
		enabled: boolean;
		favorited: boolean;
		friendlyName: string;
		id: string;
		imageURL: string;
		isCustom: boolean;
		isNew: boolean;
		isPurchased: boolean;
	};

	type ActionData = {
		actionID: string;
		actionId: string;
		actionObject: {
			currentVoice: string;
			voices: Voice[];
			value: any;
		};
		actionType: string;
		payload: {
			currentVoice: string;
			voices: Voice[];
			value: any;
		};
	};

	function clearRetry() {
		if (retryTimer !== undefined) {
			clearTimeout(retryTimer);
			retryTimer = undefined;
		}
	}

	function scheduleRetry() {
		clearRetry();
		if (!enabled() || getRemoteShellMode()) return;
		retryTimer = setTimeout(() => {
			retryTimer = undefined;
			connect();
		}, RETRY_MS);
	}

	function stopConnection() {
		connectGeneration += 1;
		clearRetry();
		const ws = state();
		if (ws.isSome()) {
			ws.unwrap().close();
		}
		setState(None);
		setConnecting(false);
	}

	function attachSocket(ws: WebSocket, generation: number) {
		ws.send(
			JSON.stringify({
				id: crypto.randomUUID(),
				action: "registerClient",
				payload: {
					clientKey: "controlapi-xSVAjWxbl",
				},
			}),
		);
		setTimeout(() => {
			if (generation !== connectGeneration) return;
			ws.send(
				JSON.stringify({
					action: "getVoices",
					id: "doesntMatter",
					payload: {},
				}),
			);
		}, 2000);
		setTimeout(() => {
			if (generation !== connectGeneration) return;
			ws.send(
				JSON.stringify({
					action: "getHearMyselfStatus",
					id: "doesntMatter",
					payload: {},
				}),
			);
		}, 2000);
		setTimeout(() => {
			if (generation !== connectGeneration) return;
			ws.send(
				JSON.stringify({
					action: "getVoiceChangerStatus",
					id: "doesntMatter",
					payload: {},
				}),
			);
		}, 2000);

		ws.addEventListener("close", () => {
			if (generation !== connectGeneration) return;
			setState(None);
			setConnecting(false);
			if (enabled()) scheduleRetry();
		});

		ws.addEventListener("message", (event) => {
			const data = JSON.parse(event.data) as ActionData;
			if (data.actionType === "getVoices") {
				setVoices(
					new Map(
						data.payload.voices.map(
							(voice: { friendlyName: string; id: string }) => [
								voice.friendlyName,
								voice.id,
							],
						),
					),
				);
			}
			if (data.actionType === "toggleVoiceChanger") {
				setVoiceChanger(data.actionObject.value);
			}
			if (data.actionType === "toggleHearMyVoice") {
				setHearVoice(data.actionObject.value);
			}
		});
	}

	const connect = () => {
		if (getRemoteShellMode() || !enabled()) return;
		if (state().isSome() || connecting()) return;

		clearRetry();

		const generation = ++connectGeneration;
		setConnecting(true);

		let connected = false;
		let pending = PORTS.length;

		const finishAttempt = () => {
			pending -= 1;
			if (connected || pending > 0) return;
			if (generation !== connectGeneration) return;
			setConnecting(false);
			if (enabled()) scheduleRetry();
		};

		for (const port of PORTS) {
			const ws = new WebSocket(`ws://localhost:${port}/v1`);
			ws.addEventListener("error", () => {
				ws.close();
				finishAttempt();
			});
			ws.addEventListener("open", () => {
				if (connected || generation !== connectGeneration) {
					ws.close();
					finishAttempt();
					return;
				}
				connected = true;
				clearRetry();
				setState(Some(ws));
				setConnecting(false);
				attachSocket(ws, generation);
				finishAttempt();
			});
		}
	};

	const setEnabled = (on: boolean) => {
		try {
			if (on) localStorage.setItem(ENABLED_KEY, "1");
			else localStorage.removeItem(ENABLED_KEY);
		} catch {
			/* ignore */
		}
		setEnabledState(on);
		if (!on) {
			stopConnection();
			return;
		}
		connect();
	};

	if (!getRemoteShellMode() && enabled()) {
		connect();
	}

	return {
		enabled,
		setEnabled,
		state,
		connecting,
		connect,
		voices,
		voiceChanger,
		hearVoice,
		collectHostMirror() {
			return {
				enabled: enabled(),
				voiceEntries: [...voices().entries()] as [string, string][],
				voiceChanger: voiceChanger(),
				hearVoice: hearVoice(),
				connected: state().isSome(),
			};
		},
		applyHostMirror(data: unknown) {
			if (!getRemoteShellMode() || !data || typeof data !== "object") return;
			const d = data as {
				enabled?: boolean;
				voiceEntries?: [string, string][];
				voiceChanger?: boolean;
				hearVoice?: boolean;
			};
			const voiceEntries = d.voiceEntries;
			setVoices(
				new Map(
					Array.isArray(voiceEntries)
						? voiceEntries.filter(
								(e): e is [string, string] =>
									Array.isArray(e) &&
									e.length === 2 &&
									typeof e[0] === "string" &&
									typeof e[1] === "string",
							)
						: [],
				),
			);
			if (typeof d.voiceChanger === "boolean") setVoiceChanger(d.voiceChanger);
			if (typeof d.hearVoice === "boolean") setHearVoice(d.hearVoice);
		},
		clearHostMirror() {
			if (!getRemoteShellMode()) return;
			setVoices(new Map());
			setVoiceChanger(false);
			setHearVoice(false);
		},
	};
}
