import { createMemo } from "solid-js";
import {
	ErrorBoundary,
	For,
	Show,
	Suspense,
	createSignal,
	startTransition,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import clsx from "clsx";
import type { Core } from "@macrograph/runtime";
import {
	Button,
	Dialog,
	DialogCloseButton,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "@macrograph/ui";

export function ConnectionsContent(props: { core: Core }) {
	const packages = createMemo(() =>
		props.core.packages
			.sort((a, b) => a.name.localeCompare(b.name))
			.filter((p) => !!p.SettingsUI),
	);

	const [selectedPackage, setSelectedPackage] = createSignal(packages()[0]);

	return (
		<>
			<div class="w-48 shrink-0 overflow-y-auto border-r border-neutral-700">
				<div class="flex flex-col text-neutral-400 font-light">
					<For each={packages()}>
						{(pkg) => (
							<button
								type="button"
								onClick={() =>
									startTransition(() => setSelectedPackage(pkg))
								}
								class={clsx(
									"px-3 py-2 text-left hover:text-white transition-colors",
									selectedPackage() === pkg && "text-white bg-neutral-800",
								)}
							>
								{pkg.name}
							</button>
						)}
					</For>
				</div>
			</div>
			<div class="flex-1 overflow-y-auto p-4 text-white">
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
								<Dynamic {...selectedPackage()?.ctx} component={UI} />
							</ErrorBoundary>
						)}
					</Show>
				</Suspense>
			</div>
		</>
	);
}

export function ConnectionsDialog(props: { core: Core }) {
	const [open, setOpen] = createSignal(false);

	return (
		<Dialog onOpenChange={setOpen} open={open()}>
			<DialogTrigger<typeof Button>
				as={(props) => (
					<Button size="icon" variant="ghost" title="Connections" {...props} />
				)}
			>
				<IconGravityUiPlugConnection class="size-5" />
			</DialogTrigger>
			<DialogContent class="min-h-[25rem] flex flex-col">
				<div class="p-4 border-b flex flex-row justify-between items-center">
					<DialogTitle class="font-bold text-2xl">Connections</DialogTitle>
					<DialogCloseButton />
				</div>
				<ConnectionsContent core={props.core} />
			</DialogContent>
		</Dialog>
	);
}
