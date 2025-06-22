import { None, Some, type Option } from "@macrograph/option";
import { createSignal } from "solid-js";

export type Ctx = ReturnType<typeof createCtx>;

export function createCtx() {
	const ports = [
		59129, 20000, 39273, 42152, 43782, 46667, 35679, 37170, 38501, 33952, 30546,
	];

	const [state, setState] = createSignal<Option<WebSocket>>(None);
	const [voices, setVoices] = createSignal<Map<string, string>>(new Map());
	const [voiceChanger, setVoiceChanger] = createSignal(false);
	const [hearVoice, setHearVoice] = createSignal(false);
	const [backgroundEffects, setBackgroundEffects] = createSignal(false);
	const [micMute, setMicMute] = createSignal(false);

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

	const connect = () => {
		for (const port of ports) {
			const ws = new WebSocket(`ws://localhost:${port}/v1`);
			ws.addEventListener("open", (event) => {
				setState(Some(ws));
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
					ws.send(
						JSON.stringify({
							action: "getVoices",
							id: "doesntMatter",
							payload: {},
						}),
					);
				}, 2000);
				setTimeout(() => {
					ws.send(
						JSON.stringify({
							action: "getHearMyselfStatus",
							id: "doesntMatter",
							payload: {},
						}),
					);
				}, 2000);
				setTimeout(() => {
					ws.send(
						JSON.stringify({
							action: "getVoiceChangerStatus",
							id: "doesntMatter",
							payload: {},
						}),
					);
				}, 2000);
                setTimeout(() => {
					ws.send(
						JSON.stringify({
							action: "getBackgroundEffectStatus",
							id: "doesntMatter",
							payload: {},
						}),
					);
				}, 2000);
                setTimeout(() => {
					ws.send(
						JSON.stringify({
							action: "getMuteMicStatus",
							id: "doesntMatter",
							payload: {},
						}),
					);
				}, 2000);
				ws.addEventListener("close", (event) => {
					console.log(`Port: ${port} Closed.`);
					setState(None);
					setTimeout(() => {
						connect();
					}, 30000);
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
                    if(data.actionType === "toggleBackground") {
                        setBackgroundEffects(data.actionObject.value);
                    }
                    if(data.actionType === "toggleMuteMic") {
                        setMicMute(data.actionObject.value);
                    }

				});
			});
		}

		if (state() === None) {
			setTimeout(() => {
				connect();
			}, 30000);
		}
	};

	connect();

	return { state, setState, voices, setVoices, voiceChanger, hearVoice, backgroundEffects, micMute };
}
