import { QueryClient } from "@tanstack/solid-query";
import type { Component, ParentProps } from "solid-js";

export const queryClient = new QueryClient();

type RpcKey = string;
type RpcArgs = unknown[];

function invoke(key: RpcKey, args: RpcArgs): Promise<any> {
	const electronAPI = window.electronAPI;

	switch (key) {
		case "fs.list":
			return electronAPI.fs.list(args[0] as string);
	case "shell.execute":
		return electronAPI.shell.execute(args[0] as { command: string; shell: string });
		case "remoteHost.send":
			return electronAPI.remoteHost.send(args[0] as any);
		case "remoteHost.setPassword":
			return electronAPI.remoteHost.setPassword(args[0] as string | null);
		case "loginListen":
			return electronAPI.loginListen();
		default:
			return Promise.reject(new Error(`Unknown rpc key: ${key}`));
	}
}

export const client = {
	query: <T = unknown>([key, ...args]: [RpcKey, ...RpcArgs]): Promise<T> => {
		return invoke(key, args) as Promise<T>;
	},
	mutation: <T = unknown>([key, ...args]: [RpcKey, ...RpcArgs]): Promise<T> => {
		return invoke(key, args) as Promise<T>;
	},
	addSubscription: (
		[key, ...args]: [RpcKey, ...RpcArgs],
		opts: { onData: (...data: any[]) => void },
	) => {
		if (key === "remoteHost.server") {
			const port = args[0] as number;
			const password = (args[1] as string | null) ?? null;

			window.electronAPI.remoteHost.start({ port, password });

			const unlisten = window.electronAPI.onEvent(
				"remote-host://message",
				(eventPayload: unknown) => {
					opts.onData(eventPayload);
				},
			);

			return () => {
				window.electronAPI.remoteHost.stop();
				unlisten();
			};
		}

		return () => {};
	},
};

export const rspc = {
	Provider: ((props: ParentProps) => props.children) as unknown as Component<
		ParentProps & { client: typeof client; queryClient: QueryClient }
	>,
	createSubscription: (
		getKey: () => [RpcKey, ...RpcArgs],
		opts: { onData: (data: any) => void; onError?: (err: any) => void },
	) => {
		const [key, ...args] = getKey();
		invoke(key, args).then(opts.onData).catch(opts.onError);
		return () => {};
	},
};
