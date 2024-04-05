import { redirect } from "@solidjs/router";
import { APIEvent } from "@solidjs/start/server";
import { appendResponseHeader } from "vinxi/http";
import { DownloadTarget, getDownloadURL } from "~/lib/releases";

export async function GET({ params }: APIEvent) {
  appendResponseHeader("Cache-Control", `public, max-age=${60 * 60 * 24}`);

  return redirect(await getDownloadURL(params.target as DownloadTarget));
}
