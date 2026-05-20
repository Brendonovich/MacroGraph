import { StartClient, mount } from "@solidjs/start/client";
import { crashLogAppend } from "./commands";

function formatError(err: unknown): string {
	if (err instanceof Error) {
		return `${err.name}: ${err.message}${err.stack ? `\n${err.stack}` : ""}`;
	}
	try {
		return JSON.stringify(err);
	} catch {
		return String(err);
	}
}

function installCrashDiagnostics() {
	const append = async (kind: string, message: string) => {
		try {
			await crashLogAppend(kind, message);
		} catch {
			// vinxi dev / non-Tauri
		}
	};

	const log = (label: string, err: unknown) => {
		const message = formatError(err);
		console.error(`[MacroGraph] ${label}`, err);
		void append(label, message);
	};

	window.addEventListener("error", (e) => {
		log("uncaught error", e.error ?? e.message);
	});
	window.addEventListener("unhandledrejection", (e) => {
		log("unhandled rejection", e.reason);
	});
	window.addEventListener("pagehide", () => {
		void append("pagehide", "webview pagehide (possible shutdown)");
	});
}

installCrashDiagnostics();

mount(() => <StartClient />, document.getElementById("app")!);
