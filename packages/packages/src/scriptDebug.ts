const PREFIX = "[MacroGraph Script]";

/** Set `localStorage.mg-script-debug` to `"1"` (on) or `"0"` (off). Default: on in dev. */
export function scriptDebugEnabled(): boolean {
	if (typeof localStorage !== "undefined") {
		const flag = localStorage.getItem("mg-script-debug");
		if (flag === "0") return false;
		if (flag === "1") return true;
	}
	try {
		return import.meta.env.DEV;
	} catch {
		return true;
	}
}

let announced = false;

function announceOnce() {
	if (announced || !scriptDebugEnabled()) return;
	announced = true;
	console.info(
		`${PREFIX} debug logging is ON. Filter console by "${PREFIX}". Disable: localStorage.setItem("mg-script-debug","0")`,
	);
}

export function scriptLog(...args: unknown[]) {
	if (!scriptDebugEnabled()) return;
	announceOnce();
	console.log(PREFIX, ...args);
}

export function scriptLogGroup(
	label: string,
	data: Record<string, unknown>,
	level: "log" | "warn" = "log",
) {
	if (!scriptDebugEnabled()) return;
	announceOnce();
	const fn = level === "warn" ? console.warn : console.log;
	fn(`${PREFIX} ${label}`);
	for (const [key, value] of Object.entries(data)) {
		fn(`  ${key}:`, value);
	}
}

export function scriptLogDts(label: string, dts: string) {
	if (!scriptDebugEnabled()) return;
	announceOnce();
	console.groupCollapsed(`${PREFIX} ${label}`);
	console.log(dts);
	console.groupEnd();
}

if (typeof globalThis !== "undefined") {
	(globalThis as Record<string, unknown>).__mgScriptDebug = {
		enable: () => {
			localStorage.setItem("mg-script-debug", "1");
			console.info(`${PREFIX} debug enabled — reload or edit code to see logs`);
		},
		disable: () => {
			localStorage.setItem("mg-script-debug", "0");
			console.info(`${PREFIX} debug disabled`);
		},
		isEnabled: scriptDebugEnabled,
	};
}
