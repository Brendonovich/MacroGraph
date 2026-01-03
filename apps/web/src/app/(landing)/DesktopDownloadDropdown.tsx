import {
	Badge,
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
} from "@macrograph/ui";
import { cache, createAsync } from "@solidjs/router";
import { appendResponseHeader } from "@solidjs/start/http";
import { type ComponentProps, For, type JSX, Suspense } from "solid-js";

import {
	type DownloadTarget,
	getDownloadURL,
	getLatestVersion,
} from "~/lib/releases";

const getDownloadURL_cached = cache((target: DownloadTarget) => {
	"use server";

	appendResponseHeader("CDN-Cache-Control", `public, max-age=${60 * 60 * 5}`);

	return getDownloadURL(target);
}, "getLatestVersion");

const getLatestVersion_cached = cache(() => {
	"use server";

	appendResponseHeader("CDN-Cache-Control", `public, max-age=${60 * 60 * 5}`);

	return getLatestVersion();
}, "getLatestVersion");

export function DesktopDownloadDropdown(
	props: ComponentProps<typeof DropdownMenu>,
) {
	const _latestVersion = createAsync(() => getLatestVersion_cached());

	return (
		<DropdownMenu {...props}>
			{props.children}
			<DropdownMenuContent>
				<Suspense
					fallback={
						<div class="px-2 py-1 font-medium">Loading Versions...</div>
					}
				>
					<For
						each={
							[
								["windows-x86_64", "Windows"],
								[
									"darwin-aarch64",
									["macOS", <Badge class="ml-2">Apple Silicon</Badge>],
								],
								["darwin-x86_64", ["macOS", <Badge class="ml-2">Intel</Badge>]],
								[
									"linux-x86_64-AppImage",
									["Linux", <Badge class="ml-2">AppImage</Badge>],
								],
								[
									"linux-x86_64-deb",
									["Linux", <Badge class="ml-2">deb</Badge>],
								],
							] satisfies Array<[DownloadTarget, JSX.Element]>
						}
					>
						{([target, name]) => (
							<DropdownMenuItem
								onSelect={() =>
									getDownloadURL_cached(target).then((url) => window.open(url))
								}
							>
								{name}
							</DropdownMenuItem>
						)}
					</For>
				</Suspense>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
