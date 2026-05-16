export type RemoteHostRpcRequest = {
	method: string;
	params: unknown;
};

type RemoteHostRpcHandler = (req: RemoteHostRpcRequest) => Promise<unknown>;

let handler: RemoteHostRpcHandler | null = null;

export function setRemoteHostRpcHandler(h: RemoteHostRpcHandler | null) {
	handler = h;
}

export function remoteHostRpcRequest(req: RemoteHostRpcRequest): Promise<unknown> {
	if (!handler) {
		return Promise.reject(
			new Error("Remote host RPC is not available (not connected)."),
		);
	}
	return handler(req);
}
