/** Desktop (Tauri) native WebSocket bridges — no browser mixed-content limits on `ws://`. */

export type ObsNativeBridge = {
	connect(args: {
		url: string;
		password?: string | null;
	}): Promise<void>;
	disconnect(args: { url: string }): Promise<void>;
	/** Drop every native OBS session (e.g. before webview reload). */
	disconnectAll?(): Promise<void>;
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
	/** Abort every native outbound session (e.g. before reloading persisted URLs). */
	closeAll?(): Promise<void>;
	/** Active session URL keys in the native layer (includes orphans not in UI storage). */
	list?(): Promise<string[]>;
	/** Authoritative transport connected flag (use when UI events desync). */
	isConnected?(url: string): Promise<boolean>;
	/** Stop native sessions whose URL is not in `keep`. */
	pruneExcept?(keep: string[]): Promise<void>;
	send(args: { url: string; data: string }): Promise<void>;
	subscribeMessages(
		url: string,
		handler: (msg: OutboundWsClientMsg) => void,
	): () => void;
};

export type OutboundWsClientMsg =
	| "Open"
	| { Text: string }
	| "Closed"
	| { Error: string };
