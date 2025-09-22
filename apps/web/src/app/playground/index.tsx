import { clientOnly } from "@solidjs/start";
import "./playground.css";

const Editor = clientOnly(() => import("./Editor"));

// export default function () {
// 	return (
// 		<div class="w-screen h-screen bg-neutral-900 text-white flex flex-col">
// 			<Meta name="mobile-web-app-capable" content="yes" />
// 			<Meta
// 				name="viewport"
// 				content="width=device-width, initial-scale=1, maximum-scale=1"
// 			/>
// 			<Header />
// 			<main class="flex-1 w-full bg-neutral-800 overflow-hidden">
// 				<Editor />
// 			</main>
// 		</div>
// 	);
// }

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
import { Meta } from "@solidjs/meta";
import { HeaderAuthFallback } from "../HeaderAuthSection";
import { Logo } from "../Logo";

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
				<AuthSection fallback={<HeaderAuthFallback />} />
			</div>
		</header>
	);
}
