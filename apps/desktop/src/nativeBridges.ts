import type { ObsNativeBridge, OutboundWsBridge } from "@macrograph/runtime";

import { client } from "./rspc";

export const obsNativeBridge: ObsNativeBridge = {
	connect: (args) =>
		client.mutation([
			"obsNative.connect",
			{ url: args.url, password: args.password ?? null },
		]) as unknown as Promise<void>,
	disconnect: (args) =>
		client.mutation(["obsNative.disconnect", args.url]) as unknown as Promise<void>,
	call: (args) =>
		client.mutation([
			"obsNative.call",
			{
				url: args.url,
				requestType: args.requestType,
				requestData: args.requestData ?? null,
			},
		]) as Promise<unknown>,
	callBatch: (args) =>
		client.mutation([
			"obsNative.callBatch",
			{ url: args.url, requests: args.requests as unknown[] },
		]) as Promise<unknown[]>,
	subscribeEvents(url, handler) {
		return client.addSubscription(["obsNative.events", url], {
			onData: handler,
		});
	},
};

export const outboundWsBridge: OutboundWsBridge = {
	open: (url) =>
		client.mutation(["outboundWs.open", url]) as unknown as Promise<void>,
	close: (url) =>
		client.mutation(["outboundWs.close", url]) as unknown as Promise<void>,
	send: (args) =>
		client.mutation(["outboundWs.send", args]) as unknown as Promise<void>,
	subscribeMessages(url, handler) {
		return client.addSubscription(["outboundWs.messages", url], {
			onData: handler,
		});
	},
};
