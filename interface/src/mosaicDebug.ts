const MOSAIC_DEBUG = false;

export function mosaicDebug(
	phase: string,
	data?: Record<string, unknown>,
) {
	if (!MOSAIC_DEBUG) return;
	console.log("[mosaic-debug]", phase, data ?? {});
}
