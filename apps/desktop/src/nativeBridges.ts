import type { ObsNativeBridge, OutboundWsBridge } from "@macrograph/runtime";

import { client } from "./rspc";

export const obsNativeBridge: ObsNativeBridge = {
	connect: (args) => client.mutation(["obsNative.connect", args]),
	disconnect: (args) => client.mutation(["obsNative.disconnect", args.url]),
	call: (args) => client.mutation(["obsNative.call", args]),
	callBatch: (args) =>
		client.mutation([
			"obsNative.callBatch",
			{ url: args.url, requests: args.requests as unknown[] },
		]),
	subscribeEvents(url, handler) {
		return client.addSubscription(["obsNative.events", url], {
			onData: handler,
		});
	},
};

export const outboundWsBridge: OutboundWsBridge = {
	open: (url) => client.mutation(["outboundWs.open", url]),
	close: (url) => client.mutation(["outboundWs.close", url]),
	send: (args) => client.mutation(["outboundWs.send", args]),
	subscribeMessages(url, handler) {
		return client.addSubscription(["outboundWs.messages", url], {
			onData: handler,
		});
	},
};
