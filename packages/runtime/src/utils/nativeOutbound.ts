/** Desktop (Tauri) native WebSocket bridges — no browser mixed-content limits on `ws://`. */

export type ObsNativeBridge = {
	connect(args: {
		url: string;
		password?: string | null;
	}): Promise<void>;
	disconnect(args: { url: string }): Promise<void>;
	call(args: {
		url: string;
		requestType: string;
		requestData?: unknown;
	}): Promise<unknown>;
	callBatch(args: {
		url: string;
		requests: { requestType: string; requestData?: unknown }[];
	}): Promise<unknown[]>;
	subscribeEvents(
		url: string,
		handler: (msg: ObsNativeEventMsg) => void,
	): () => void;
};

export type ObsNativeEventMsg = {
	lifecycle?: string;
	eventType?: string;
	eventData?: unknown;
};

export type OutboundWsBridge = {
	open(url: string): Promise<void>;
	close(url: string): Promise<void>;
	send(args: { url: string; data: string }): Promise<void>;
	subscribeMessages(
		url: string,
		handler: (msg: OutboundWsClientMsg) => void,
	): () => void;
};

export type OutboundWsClientMsg =
	| "Open"
	| { Text: string }
	| "Closed";
