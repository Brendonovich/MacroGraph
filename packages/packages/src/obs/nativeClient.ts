import type { ObsNativeBridge } from "@macrograph/runtime";
import EventEmitter from "eventemitter3";
import type { EventTypes } from "obs-websocket-js";

/** Drop-in replacement for `obs-websocket-js` `OBS` when using the Tauri native bridge. */
export class NativeObsClient extends EventEmitter<EventTypes> {
	constructor(
		private bridge: ObsNativeBridge,
		public readonly connectionUrl: string,
	) {
		super();
	}

	async connect(
		_url?: string,
		_password?: string,
		_opts?: unknown,
	): Promise<void> {}

	async disconnect(): Promise<void> {
		await this.bridge.disconnect({ url: this.connectionUrl });
		this.removeAllListeners();
	}

	call(requestType: string, requestData?: unknown): Promise<unknown> {
		return this.bridge.call({
			url: this.connectionUrl,
			requestType,
			requestData,
		});
	}

	callBatch(
		requests: { requestType: string; requestData?: unknown }[],
	): Promise<unknown[]> {
		return this.bridge.callBatch({
			url: this.connectionUrl,
			requests,
		});
	}
}
