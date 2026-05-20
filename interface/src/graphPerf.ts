type Mark = {
	label: string;
	ms: number;
	meta?: Record<string, unknown>;
};

type Counters = {
	nodesMounted: number;
	pinLayouts: number;
	pinLayoutMs: number;
	connectionRenders: number;
	connectionDrawMs: number;
	dotGridDraws: number;
	dotGridDrawMs: number;
};

let enabled: boolean | null = null;

function isEnabled() {
	if (enabled === null) {
		try {
			enabled =
				import.meta.env.DEV ||
				localStorage.getItem("mg:graph-perf") === "1";
		} catch {
			enabled = import.meta.env.DEV;
		}
	}
	return enabled;
}

let sessionStart = 0;
let sessionLabel = "";
const marks: Mark[] = [];
let counters: Counters = emptyCounters();
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let lastCounterSnapshot = "";

function emptyCounters(): Counters {
	return {
		nodesMounted: 0,
		pinLayouts: 0,
		pinLayoutMs: 0,
		connectionRenders: 0,
		connectionDrawMs: 0,
		dotGridDraws: 0,
		dotGridDrawMs: 0,
	};
}

function bumpIdleComplete() {
	if (!isEnabled() || !sessionStart) return;
	clearTimeout(idleTimer);
	idleTimer = setTimeout(() => {
		const snap = JSON.stringify(counters);
		if (snap === lastCounterSnapshot) {
			mark("idle.complete");
			flushSummary();
			sessionStart = 0;
		} else {
			lastCounterSnapshot = snap;
			mark("idle.progress", { ...counters });
			bumpIdleComplete();
		}
	}, 500);
}

export function startGraphLoadSession(
	label: string,
	meta?: Record<string, unknown>,
) {
	if (!isEnabled()) return;
	clearTimeout(idleTimer);
	sessionStart = performance.now();
	sessionLabel = label;
	marks.length = 0;
	counters = emptyCounters();
	lastCounterSnapshot = "";
	mark("session.start", meta);
	bumpIdleComplete();
}

export function mark(label: string, meta?: Record<string, unknown>) {
	if (!isEnabled() || !sessionStart) return;
	const ms = performance.now() - sessionStart;
	marks.push({ label, ms, meta });
}

export function trackNodeMount() {
	if (!isEnabled() || !sessionStart) return;
	counters.nodesMounted++;
	bumpIdleComplete();
}

export function trackPinLayout(durationMs: number) {
	if (!isEnabled() || !sessionStart) return;
	counters.pinLayouts++;
	counters.pinLayoutMs += durationMs;
	bumpIdleComplete();
}

export function trackConnectionDraw(durationMs: number, connectionCount: number) {
	if (!isEnabled() || !sessionStart) return;
	counters.connectionRenders++;
	counters.connectionDrawMs += durationMs;
	bumpIdleComplete();
	if (counters.connectionRenders <= 3 || counters.connectionRenders % 10 === 0) {
		mark("connections.draw", {
			ms: durationMs.toFixed(2),
			render: counters.connectionRenders,
			connections: connectionCount,
		});
	}
}

export function trackDotGridDraw(durationMs: number) {
	if (!isEnabled() || !sessionStart) return;
	counters.dotGridDraws++;
	counters.dotGridDrawMs += durationMs;
	bumpIdleComplete();
	if (counters.dotGridDraws <= 3) {
		mark("dotGrid.draw", {
			ms: durationMs.toFixed(2),
			render: counters.dotGridDraws,
		});
	}
}

function flushSummary() {
	void sessionLabel;
	void marks;
	void counters;
}
