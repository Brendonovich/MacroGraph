export * from "./pins";

export type XY = { x: number; y: number };
export type Size = { width: number; height: number };

export const map = <I, O>(value: I | null, cb: (v: I) => O): O | null => {
	if (value === null) return null;
	return cb(value);
};

export type WsMessage = "Connected" | "Disconnected" | { Text: string };

export interface WsProvider<TServer> {
	startServer(
		port: number,
		cb: (text: [number, WsMessage]) => void,
	): Promise<TServer>;
	stopServer(server: TServer): Promise<void>;
	sendMessage(data: {
		data: string;
		port: number;
		client: number | null;
	}): Promise<null>;
}

export function createWsProvider<T>(p: WsProvider<T>) {
	return p;
}

// Modified from the amazing Tanstack Query library (MIT)
// https://github.com/TanStack/query/blob/main/packages/query-core/src/utils.ts#L168
export function hashKey<T extends Array<any>>(args: T): string {
	return JSON.stringify(args, (_, val) =>
		isPlainObject(val)
			? Object.keys(val)
					.sort()
					.reduce((result, key) => {
						result[key] = val[key];
						return result;
					}, {} as any)
			: val,
	);
}

function isPlainObject(obj: any): obj is Record<string, any> {
	if (obj === null || typeof obj !== "object") return false;

	const proto = Object.getPrototypeOf(obj);
	return !proto || proto === Object.prototype;
}
