import { StartClient, mount } from "@solidjs/start/client";

function installCrashDiagnostics() {
	const log = (label: string, err: unknown) => {
		console.error(`[MacroGraph] ${label}`, err);
	};
	window.addEventListener("error", (e) => {
		log("uncaught error", e.error ?? e.message);
	});
	window.addEventListener("unhandledrejection", (e) => {
		log("unhandled rejection", e.reason);
	});
}

installCrashDiagnostics();

mount(() => <StartClient />, document.getElementById("app")!);
