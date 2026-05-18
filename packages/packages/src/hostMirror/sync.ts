import type { Core } from "@macrograph/runtime";
import { getRemoteShellMode } from "@macrograph/runtime";

import { collectHostMirrorPayload, type HostMirrorPayload } from "./wire";

type HostMirrorBroadcast = (payload: HostMirrorPayload) => void;

let broadcast: HostMirrorBroadcast | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let pendingCore: Core | null = null;
let hostCore: Core | null = null;

/** Desktop registers the live core instance for packages that lack a core ref. */
export function registerHostMirrorCore(core: Core | null) {
	hostCore = core;
}

/** Desktop registers this to push mirror updates to connected remote clients. */
export function setHostMirrorBroadcast(fn: HostMirrorBroadcast | null) {
	broadcast = fn;
}

/** Request a debounced mirror push using the registered host core. */
export function requestHostMirrorSync() {
	if (hostCore) scheduleHostMirrorSync(hostCore);
}

/** Debounced host mirror refresh (no-op on remote shell). */
export function scheduleHostMirrorSync(core: Core) {
	if (getRemoteShellMode()) return;
	pendingCore = core;
	if (timer !== null) return;
	timer = setTimeout(() => {
		timer = null;
		const c = pendingCore;
		pendingCore = null;
		if (!c || !broadcast) return;
		void collectHostMirrorPayload(c)
			.then(broadcast)
			.catch(() => {
				/* best-effort */
			});
	}, 80);
}
