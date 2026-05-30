import type { ObsNativeBridge, ObsNativeEventMsg, OutboundWsBridge, OutboundWsClientMsg } from "@macrograph/runtime";

const OBS_EVENT = "obs:event";
const OUTBOUND_WS_EVENT = "outboundWs:message";

export const obsNativeBridge: ObsNativeBridge = {
	connect: (args) =>
		window.electronAPI.obs.connect({ url: args.url, password: args.password ?? null }) as unknown as Promise<void>,
	disconnect: (args) =>
		window.electronAPI.obs.disconnect(args.url) as unknown as Promise<void>,
	disconnectAll: () =>
		window.electronAPI.obs.disconnectAll() as unknown as Promise<void>,
	call: (args) =>
		window.electronAPI.obs.call({
			url: args.url,
			requestType: args.requestType,
			requestData: args.requestData ?? null,
		}) as Promise<unknown>,
	callBatch: (args) =>
		window.electronAPI.obs.callBatch({
			url: args.url,
			requests: args.requests as { requestType: string; requestData?: unknown }[],
		}) as Promise<unknown[]>,
	subscribeEvents(url, handler) {
		const unlisten = window.electronAPI.onEvent(OBS_EVENT, (eventPayload: unknown) => {
			const [eventUrl, msg] = eventPayload as [string, ObsNativeEventMsg];
			if (eventUrl === url) handler(msg);
		});
		return () => unlisten();
	},
};

export const outboundWsBridge: OutboundWsBridge = {
	open: (url) =>
		window.electronAPI.outboundWs.open(url) as unknown as Promise<void>,
	close: (url) =>
		window.electronAPI.outboundWs.close(url) as unknown as Promise<void>,
	closeAll: () =>
		window.electronAPI.outboundWs.closeAll() as unknown as Promise<void>,
	list: () =>
		window.electronAPI.outboundWs.list() as unknown as Promise<string[]>,
	isConnected: (url) =>
		window.electronAPI.outboundWs.isConnected(url) as unknown as Promise<boolean>,
	pruneExcept: (keep) =>
		window.electronAPI.outboundWs.pruneExcept(keep) as unknown as Promise<void>,
	send: (args) =>
		window.electronAPI.outboundWs.send(args) as unknown as Promise<void>,
	subscribeMessages(url, handler) {
		const unlisten = window.electronAPI.onEvent(OUTBOUND_WS_EVENT, (eventPayload: unknown) => {
			const [eventUrl, msg] = eventPayload as [string, OutboundWsClientMsg];
			if (eventUrl === url) handler(msg);
		});
		return () => unlisten();
	},
};
