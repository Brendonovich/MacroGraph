import {
	ErrorBoundary,
	For,
	Show,
	Suspense,
	createSignal,
	startTransition,
} from "solid-js";
import { createMemo } from "solid-js";
import { Dynamic } from "solid-js/web";

import {
	Button,
	Dialog,
	DialogCloseButton,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "@macrograph/ui";
import { As, Tabs } from "@kobalte/core";
import { Core } from "@macrograph/runtime";

export function ConnectionsDialog(props: { core: Core }) {
	const [open, setOpen] = createSignal(false);

	const packages = createMemo(() =>
		props.core.packages
			.sort((a, b) => a.name.localeCompare(b.name))
			.filter((p) => !!p.SettingsUI),
	);

	const [selectedPackage, setSelectedPackage] = createSignal(packages()[0]);

	return (
		<Dialog onOpenChange={setOpen} open={open()}>
			<DialogTrigger asChild>
				<As component={Button} size="icon" variant="ghost" title="Connections">
					<IconGravityUiPlugConnection class="w-6 h-6" />
				</As>
			</DialogTrigger>
			<DialogContent>
				<div class="p-4 border-b flex flex-row justify-between items-center">
					<DialogTitle class="font-bold text-2xl">Connections</DialogTitle>
					<DialogCloseButton />
				</div>
				<div class="flex flex-row divide-x divide overflow-auto">
					<Tabs.Root value={selectedPackage()?.name} orientation="vertical">
						<Tabs.List class="flex flex-col relative text-neutral-400 font-light">
							<For each={packages()}>
								{(pkg) => (
									<Tabs.Trigger
										value={pkg.name}
										onClick={() =>
											startTransition(() => setSelectedPackage(pkg))
										}
										class="px-3 py-2 text-left ui-selected:text-white"
									>
										{pkg.name}
									</Tabs.Trigger>
								)}
							</For>
							<Tabs.Indicator class="bg-white w-[2px] absolute -right-[1.5px] transition-transform rounded-full" />
						</Tabs.List>
					</Tabs.Root>
					<div class="flex flex-col p-4 text-white min-w-[32rem]">
						<Suspense fallback="Loading">
							<Show when={selectedPackage()?.SettingsUI} keyed>
								{(UI) => (
									<ErrorBoundary
										fallback={(error: Error) => (
											<div>
												<p>An error occurred:</p>
												<p>{error.message}</p>
											</div>
										)}
									>
										<div>
											<Dynamic {...selectedPackage()?.ctx} component={UI} />
										</div>
									</ErrorBoundary>
								)}
							</Show>
						</Suspense>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
