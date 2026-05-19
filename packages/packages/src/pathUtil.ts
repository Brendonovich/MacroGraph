/** Invisible Unicode often pasted before Windows paths (Explorer, browsers). */
const INVISIBLE_PATH_CHARS =
	/[\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

/** All whitespace (spaces, tabs, newlines, NBSP, etc.). */
const WHITESPACE = /\s+/g;

const WINDOWS_DRIVE_PATH = /^[a-zA-Z]:[/\\]/;

/** Normalize a user-provided file/folder path for OS APIs. */
export function sanitizeFilePath(path: string): string {
	let p = path
		.replace(INVISIBLE_PATH_CHARS, "")
		.replace(WHITESPACE, "")
		.replace(/^["']+|["']+$/g, "");

	// Windows drive paths: use backslashes (both work on OS, keeps Tauri/Rust consistent)
	if (WINDOWS_DRIVE_PATH.test(p)) {
		p = p.replace(/\//g, "\\");
	}

	return p;
}

/** Local file size in bytes (desktop Tauri only). */
export async function getLocalFileSizeBytes(
	path: string,
): Promise<number | null> {
	if (typeof window === "undefined" || !("__TAURI_INVOKE__" in window)) {
		return null;
	}
	try {
		const { invoke } = await import("@tauri-apps/api/tauri");
		return await invoke<number>("file_size", { path: sanitizeFilePath(path) });
	} catch {
		return null;
	}
}
