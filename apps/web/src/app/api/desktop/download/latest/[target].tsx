import { redirect } from "@solidjs/router";
import type { APIEvent } from "@solidjs/start/server";
import { renderToStream, Suspense } from "solid-js/web";
import { appendResponseHeader } from "vinxi/http";
import { type DownloadTarget, getDownloadURL } from "~/lib/releases";

export async function GET({ params }: APIEvent) {
	appendResponseHeader("CDN-Cache-Control", `public, max-age=${60 * 60 * 24}`);

	return redirect(await getDownloadURL(params.target as DownloadTarget));
}
