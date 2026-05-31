declare module "multicast-dns" {
	import { EventEmitter } from "events";

	interface MulticastDNS extends EventEmitter {
		query(query: { questions: Array<{ name: string; type: string }> }, callback?: () => void): void;
		destroy(callback?: () => void): void;
		removeListener(event: string, listener: (...args: any[]) => void): this;
		on(event: "response", listener: (response: any) => void): this;
	}

	function multicastDNS(opts?: any): MulticastDNS;
	export default multicastDNS;
}
