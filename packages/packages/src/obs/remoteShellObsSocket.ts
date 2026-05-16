import { remoteHostRpcRequest } from "@macrograph/runtime";

import type { ObsSocketLike } from "./obsSocket";

export function createRemoteShellObsSocket(url: string): ObsSocketLike {
	return {
		call(requestType: string, requestData?: unknown) {
			return remoteHostRpcRequest({
				method: "obs.call",
				params: { url, requestType, requestData },
			});
		},
		callBatch(requests: { requestType: string; requestData?: unknown }[]) {
			return remoteHostRpcRequest({
				method: "obs.callBatch",
				params: { url, requests },
			}) as Promise<unknown[]>;
		},
	} as ObsSocketLike;
}
