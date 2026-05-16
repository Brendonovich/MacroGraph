import type OBSWebSocket from "obs-websocket-js";

import type { NativeObsClient } from "./nativeClient";

/** Minimal shape for suggestion factories; includes remote-shell RPC bridge. */
export type ObsSocketLike =
	| OBSWebSocket
	| NativeObsClient
	| {
			call(requestType: string, requestData?: unknown): Promise<any>;
			callBatch(
				requests: { requestType: string; requestData?: unknown }[],
			): Promise<any[]>;
	  };
