import { clientOnly } from "@solidjs/start";

const Editor = clientOnly(() => import("./Editor"));

export default function () {
	return (
		<div class="w-screen h-screen bg-neutral-900 text-white flex flex-col">
			<Header />
			<main class="flex-1 w-full bg-neutral-800 overflow-hidden">
				<Editor />
			</main>
		</div>
	);
}

import { DropdownMenuTrigger } from "@macrograph/ui";
import type { ValidComponent } from "solid-js";

const MenuItems = clientOnly(() =>
	import("./Editor").then((i) => ({ default: i.ConnectionsDialogButton })),
);
const ProjectName = clientOnly(() =>
	import("./Editor").then((i) => ({ default: i.ProjectName })),
);
const ExportButton = clientOnly(() =>
	import("./Editor").then((i) => ({ default: i.ExportButton })),
);
const ShareButton = clientOnly(() =>
	import("./Editor").then((i) => ({ default: i.ShareButton })),
);
import { DesktopDownloadDropdown } from "../DesktopDownloadDropdown";
import { HeaderAuthFallback } from "../HeaderAuthSection";
import { Logo } from "../Logo";
import { Socials } from "../Socials";

const AuthSection = clientOnly(() =>
	import("../HeaderAuthSection").then((i) => ({
		default: i.HeaderAuthSection,
	})),
);

function Header() {
	return (
		<header class="w-full flex flex-row p-2 justify-between items-center h-12">
			<div class="flex-1 flex flex-row gap-2 items-center">
				<Logo />
				<MenuItems />
			</div>
			<div class="text-sm font-medium">
				<ProjectName />
			</div>
			<div class="flex-1 flex flex-row justify-end items-center gap-1">
				<div class="flex-1 pl-2">
					<ExportButton />
					<ShareButton />
				</div>
				<DesktopDownloadDropdown>
					<DropdownMenuTrigger<ValidComponent>
						as={(props) => (
							<button
								{...props}
								class="flex-row flex items-center"
								size="icon"
								variant="ghost"
								title="Download Desktop App"
							/>
						)}
					>
						<IconTablerDeviceDesktopDown class="size-5" />
					</DropdownMenuTrigger>
				</DesktopDownloadDropdown>
				<Socials iconClass="size-6" />
				<AuthSection fallback={<HeaderAuthFallback />} />
			</div>
		</header>
	);
}
