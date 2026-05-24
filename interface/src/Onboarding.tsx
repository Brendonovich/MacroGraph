import { For, Show, createEffect, createMemo, createSignal, onCleanup, onMount, untrack } from "solid-js";
import { makePersisted } from "@solid-primitives/storage";
import { Button } from "@macrograph/ui";
import clsx from "clsx";

import { useInterfaceContext } from "./context";
import { graphRefOf } from "@macrograph/runtime";
import appIcon from "./AppIcon.png";

const PADDING = 6;

interface TourStep {
	id: string;
	title: string;
	description: string | (() => any);
	target?: string;
	placement?: "top" | "bottom" | "left" | "right";
	beforeEnter?: () => boolean | void;
	tooltipWidth?: number;
	tooltipHeight?: number;
}

function expandSidebarSection(title: string) {
	const triggers = document.querySelectorAll<HTMLButtonElement>("button[aria-expanded]");
	for (const trigger of triggers) {
		if (trigger.textContent?.trim() === title && trigger.getAttribute("aria-expanded") !== "true") {
			trigger.click();
			break;
		}
	}
}

function clickPackageInList(name: string) {
	const buttons = document.querySelectorAll<HTMLButtonElement>(
		`[data-onboarding-section="Packages"] button`,
	);
	for (const btn of buttons) {
		if (btn.textContent?.trim() === name) {
			btn.click();
			break;
		}
	}
}

const EXAMPLE_GRAPH = {
	id: 0, name: "Graph 0", nodeIdCounter: 5,
	nodes: {
		"0": { id: 0, name: "Channel Chat Message", position: { x: 60, y: 135 }, schema: { package: "Twitch Events", id: "Channel Chat Message" }, defaultValues: {}, properties: { account: { default: true } }, foldPins: false, trackInvocations: false },
		"1": { id: 1, name: "Break Struct", position: { x: 330, y: 285 }, schema: { package: "Utils", id: "Break Struct" }, defaultValues: { "": null }, properties: {}, foldPins: false, trackInvocations: false },
		"2": { id: 2, name: "String Includes", position: { x: 495, y: 285 }, schema: { package: "Utils", id: "String Includes" }, defaultValues: { haystack: "", needle: "!test" }, properties: {}, foldPins: false, trackInvocations: false },
		"3": { id: 3, name: "Branch", position: { x: 735, y: 135 }, schema: { package: "Logic", id: "Branch" }, defaultValues: { condition: false }, properties: {}, foldPins: false, trackInvocations: false },
		"4": { id: 4, name: "Send Chat Message (Helix)", position: { x: 975, y: 135 }, schema: { package: "Twitch Events", id: "Send Chat Message (Helix)" }, defaultValues: { message: "Test message works", replyId: "" }, properties: { chatAccount: { default: true }, chat: { default: true } }, foldPins: false, trackInvocations: false },
	},
	commentBoxes: [],
	variables: [],
	connections: [
		{ from: { node: 0, output: "exec" }, to: { node: 3, input: "exec" } },
		{ from: { node: 3, output: "true" }, to: { node: 4, input: "exec" } },
		{ from: { node: 0, output: "message" }, to: { node: 1, input: "" } },
		{ from: { node: 1, output: "text" }, to: { node: 2, input: "haystack" } },
		{ from: { node: 2, output: "bool" }, to: { node: 3, input: "condition" } },
	],
};

async function populateExampleGraph(ctx: ReturnType<typeof useInterfaceContext>) {
	await ctx.execute("pasteGraph", EXAMPLE_GRAPH as any);
	const graph = ctx.core.project.graphs.get(0);
	if (!graph) return;
	ctx.selectGraph(graph);
}

function createSteps(ctx: ReturnType<typeof useInterfaceContext>): TourStep[] {
	return [
		{
			id: "welcome",
			title: "Welcome to MacroGraph",
			description:
				"This tour will walk you through creating a real Twitch automation. You can skip at any time.",
		},
		{
			id: "login",
			title: "Log In",
			description:
				'Click the "Log In" button at the top-right. If you have a Twitch account, use it to log in — you will need it for the next steps. Signing up takes just a moment.',
			target: '[data-onboarding="login"]',
			placement: "bottom",
			beforeEnter: () => {
				if (!document.querySelector('[data-onboarding="login"]')) return true;
			},
		},
		{
			id: "credentials",
			title: "Set Up API Credentials",
			description:
				"Click 'Credentials' in your user menu to open the MacroGraph portal. Add a Twitch credential and follow the authentication flow. Once it's connected, come back here and continue.",
			target: '[data-onboarding="user-menu"]',
			placement: "left",
			tooltipWidth: 300,
			tooltipHeight: 200,
			beforeEnter: () => {
				if (!document.querySelector('[data-onboarding="user-menu"]')) return true;
				setTimeout(() => {
					const trigger = document.querySelector<HTMLElement>('[data-onboarding="user-menu"]');
					if (!trigger) return;
					trigger.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
					trigger.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
					trigger.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
				}, 300);
			},
		},
		{
			id: "packages",
			title: "Packages",
			description:
				"Packages add functionality. The list below shows what's available — Twitch Events, Discord, OBS, and more. Each package needs to be enabled and configured before its nodes can be used.",
			target: '[data-onboarding-section="Packages"]',
			placement: "right",
			beforeEnter: () => expandSidebarSection("Packages"),
		},
		{
			id: "enableTwitch",
			title: "Enable Twitch",
			description:
				"The Twitch Events settings are now open. Click 'Enable' next to your Twitch account to authenticate. Once connected, MacroGraph can listen to chat messages and send replies.",
			target: '[data-onboarding="package-settings"]',
			placement: "left",
			beforeEnter: () => {
				expandSidebarSection("Packages");
				setTimeout(() => clickPackageInList("Twitch Events"), 400);
			},
		},
		{
			id: "resources",
			title: "Twitch Account Resource",
			description:
				"A 'Twitch Account' resource has been created. This links your authenticated account so the nodes know who to send messages as. The resource now appears in the Resources list on the left.",
			target: '[data-onboarding-section="Resources"]',
			placement: "right",
			beforeEnter: () => {
				expandSidebarSection("Resources");
				setTimeout(() => {
					for (const [type] of ctx.core.project.resources) {
						if (type.name === "Twitch Account") return;
					}
					ctx.execute("createResource", { package: "Twitch Events", type: "Twitch Account" });
				}, 50);
			},
		},
		{
			id: "twitchChannel",
			title: "Twitch Channel Resource",
			description:
				"A 'Twitch Channel' resource has been created. Type the name of the channel where you want the bot to send messages (your channel name). This tells the nodes which channel to send the reply TO.",
			target: '[data-onboarding-section="Resources"]',
			placement: "right",
			beforeEnter: () => {
				expandSidebarSection("Resources");
				setTimeout(() => {
					for (const [type] of ctx.core.project.resources) {
						if (type.name === "Twitch Channel") return;
					}
					ctx.execute("createResource", { package: "Twitch Events", type: "Twitch Channel" });
				}, 50);
			},
		},
		{
			id: "graphsExplain",
			title: "Graphs",
			description:
				"Graphs are the canvas where you build automations. The graph will be created automatically with the example nodes — just click Next.",
			target: '[data-onboarding-section="Graphs"]',
			placement: "right",
			beforeEnter: () => expandSidebarSection("Graphs"),
		},
		{
			id: "graphCreated",
			title: "Graph Created",
			description:
				"Your graph has been created with all the Twitch nodes already placed and connected. It's already open in the editor — just click Next to walk through it.",
			target: '[data-onboarding-section="Graphs"]',
			placement: "right",
			beforeEnter: () => {
				expandSidebarSection("Graphs");
				setTimeout(() => populateExampleGraph(ctx), 50);
			},
		},
		{
			id: "exampleGraph",
			title: "Your Example Graph",
			description: "Here's your graph with the example nodes already placed.",
			target: "[data-graph-viewport]",
			placement: "top",
		},
		{
			id: "graphNavigation",
			title: "Using the Graph Editor",
			description:
				"Right-click drag on the canvas to pan around. Use Ctrl+scroll to zoom in and out. Drag any node by its header to rearrange. Right-click on empty space to open the node menu and add more nodes.",
			target: "[data-graph-viewport]",
			placement: "top",
		},
		{
			id: "nodeDetail",
			title: "Node Properties",
			description:
				"The 'Send Chat Message (Helix)' node is now selected. The right sidebar shows its properties — the Chatting Account and Channel are already set from your resources, and the message is pre-filled. You can change these values anytime.",
			target: '[data-onboarding="node-properties"]',
			placement: "left",
			beforeEnter: () => {
				try { localStorage.setItem("sidebar-Node", JSON.stringify(["Node Info"])); } catch {}
				setTimeout(() => {
					const graph = ctx.core.project.graphs.get(0);
					if (graph) {
						ctx.rightSidebar.setState({ open: true });
						ctx.execute("setGraphSelection", {
							graphKind: "graph",
							graphId: graph.id,
							selection: [{ type: "node", id: 4 }],
						});
						setTimeout(() => {
							const sidebar = document.querySelector('[data-onboarding="node-properties"]');
							if (!sidebar) return;
							const btns = sidebar.querySelectorAll<HTMLButtonElement>("button[aria-expanded]");
							for (const btn of btns) {
								if (btn.getAttribute("aria-expanded") !== "true") btn.click();
							}
						}, 100);
					}
				}, 50);
			},
		},
		{
			id: "testGraph",
			title: "Test It Out",
			description: () => <>
				The graph is already running. Go to your Twitch chat and type '!test' — the bot will reply with 'Test message works'. Join the MacroGraph{" "}
				<a href="https://discord.com/invite/FEyYaC8v53" target="_blank" rel="noopener noreferrer" class="underline text-emerald-400 hover:text-emerald-300">Discord</a>
				{" "}if you have questions or want to share what you build!
			</>,
			target: "[data-graph-viewport]",
			placement: "top",
		},
		{
			id: "complete",
			title: "You're All Set!",
			description:
				"You have working Twitch automation! Right-click on the canvas to add more nodes — try more event types (follows, subs), actions (moderation, clips), or logic (Switch, Math).",
		},
	];
}

function computeHoleRect(targetEl: Element | null): DOMRect | null {
	if (!targetEl) return null;
	try {
		const rect = targetEl.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return null;
		return rect;
	} catch {
		return null;
	}
}

function BackdropPanel(props: { top: number; left: number; width: number; height: number }) {
	return (
		<div class="fixed z-[40] bg-black/70 backdrop-blur-sm" style={{ top: `${props.top}px`, left: `${props.left}px`, width: `${Math.max(0, props.width)}px`, height: `${Math.max(0, props.height)}px` }} />
	);
}

function tooltipArrow(placement: string) {
	switch (placement) {
		case "bottom":
			return <svg class="absolute -top-2 left-1/2 -translate-x-1/2 text-background" width="16" height="8" viewBox="0 0 16 8" fill="currentColor"><path d="M0 8L8 0L16 8Z" /></svg>;
		case "top":
			return <svg class="absolute -bottom-2 left-1/2 -translate-x-1/2 text-background" width="16" height="8" viewBox="0 0 16 8" fill="currentColor"><path d="M0 0L8 8L16 0Z" /></svg>;
		case "left":
			return <svg class="absolute top-1/2 -right-2 -translate-y-1/2 text-background" width="8" height="16" viewBox="0 0 8 16" fill="currentColor"><path d="M0 0L8 8L0 16Z" /></svg>;
		case "right":
			return <svg class="absolute top-1/2 -left-2 -translate-y-1/2 text-background" width="8" height="16" viewBox="0 0 8 16" fill="currentColor"><path d="M8 0L0 8L8 16Z" /></svg>;
	}
}

export function Onboarding() {
	const ctx = useInterfaceContext();
	const [dismissed, setDismissed] = makePersisted(createSignal(false), { name: "mg-onboarding-dismissed" });
	const [step, setStep] = createSignal(0);
	const [initialEmpty, setInitialEmpty] = createSignal(false);
	const [targetRect, setTargetRect] = createSignal<DOMRect | null>(null);
	const [resourceDone, setResourceDone] = createSignal(false);
	const [channelDone, setChannelDone] = createSignal(false);

	const steps = createMemo(() => createSteps(ctx));

	onMount(() => {
		if (!ctx) return;
		const p = ctx.core.project;
		setInitialEmpty(p.graphOrder.length === 0 && p.variables.length === 0 && p.resources.size === 0);
	});

	const show = () => !dismissed() && initialEmpty();
	const currentStep = () => steps()[step()] ?? steps()[0];
	const needsTarget = () => step() > 0 && step() < steps().length - 1;
	const isWelcome = () => step() === 0;
	const isComplete = () => step() === steps().length - 1;

	createEffect(() => {
		const s = step();
		const stepDef = steps()[s];
		if (!stepDef) return;

		let mounted = true;

		if (stepDef.beforeEnter) {
			const skip = stepDef.beforeEnter();
			if (skip && mounted) { setStep((cur) => Math.min(cur + 1, steps().length - 1)); return; }
		}

		if (s === 1) {
			if (document.querySelector('[data-onboarding="user-menu"]')) {
				setStep((cur) => Math.min(cur + 1, steps().length - 1));
				return;
			}
			const id = setInterval(() => {
				if (!mounted) return;
				if (document.querySelector('[data-onboarding="user-menu"]')) {
					clearInterval(id);
					setStep((cur) => Math.min(cur + 1, steps().length - 1));
				}
			}, 500);
			onCleanup(() => clearInterval(id));
		}

		if (s === 4) {
			const hasDisable = () => {
				const el = document.querySelector('[data-onboarding="package-settings"]');
				return !!el && [...el.querySelectorAll('button')].some(b => b.textContent?.trim() === 'Disable');
			};
			if (hasDisable()) { setStep((cur) => Math.min(cur + 1, steps().length - 1)); return; }
			const id = setInterval(() => {
				if (!mounted) return;
				if (hasDisable()) { clearInterval(id); setStep((cur) => Math.min(cur + 1, steps().length - 1)); }
			}, 500);
			onCleanup(() => clearInterval(id));
		}

		if (s === 5) {
			// check initial state without tracking
			untrack(() => {
				for (const [type] of ctx.core.project.resources) {
					if (type.name === "Twitch Account") setResourceDone(true);
				}
			});
			const id = setInterval(() => {
				if (!mounted) return;
				for (const [type] of ctx.core.project.resources) {
					if (type.name === "Twitch Account") { setResourceDone(true); clearInterval(id); return; }
				}
			}, 500);
			onCleanup(() => clearInterval(id));
		}
		if (s === 6) {
			untrack(() => {
				for (const [type, entry] of ctx.core.project.resources) {
					if (type.name === "Twitch Channel") {
						const item = entry.items[0];
						if (item && "value" in item && item.value && item.value.length > 0) setChannelDone(true);
					}
				}
			});
			const id = setInterval(() => {
				if (!mounted) return;
				for (const [type, entry] of ctx.core.project.resources) {
					if (type.name === "Twitch Channel") {
						const item = entry.items[0];
						if (item && "value" in item && item.value && item.value.length > 0) {
							setChannelDone(true); clearInterval(id); return;
						}
					}
				}
			}, 500);
			onCleanup(() => clearInterval(id));
		}

		if (!stepDef.target) { setTargetRect(null); onCleanup(() => { mounted = false; }); return; }

		let pollInterval: ReturnType<typeof setInterval> | null = null;

		function measure() {
			if (!mounted) return false;
			const el = stepDef.target === "[data-graph-viewport]"
				? [...document.querySelectorAll<HTMLElement>("[data-graph-viewport]")].find(v => v.offsetWidth > 0 && v.offsetHeight > 0) ?? null
				: document.querySelector(stepDef.target!);
			if (el) {
				el.scrollIntoView({ block: "center", behavior: "instant" });
				const needsDelay = stepDef.target?.startsWith('[data-onboarding-section="') || stepDef.id === "exampleGraph";
				if (needsDelay) {
					const delay = stepDef.id === "exampleGraph" ? 400 : 300;
					setTimeout(() => {
						if (!mounted) return;
						const rect = computeHoleRect(el);
						if (rect) setTargetRect(rect);
					}, delay);
					return true;
				}
				const rect = computeHoleRect(el);
				if (rect) { setTargetRect(rect); return true; }
			}
			return false;
		}

		if (!measure()) {
			pollInterval = setInterval(() => { if (measure()) clearInterval(pollInterval!); }, 200);
		}

		function onViewportChange() {
			if (!mounted) return;
			const el = stepDef.target === "[data-graph-viewport]"
				? [...document.querySelectorAll<HTMLElement>("[data-graph-viewport]")].find(v => v.offsetWidth > 0 && v.offsetHeight > 0) ?? null
				: document.querySelector(stepDef.target!);
			if (el) { const rect = computeHoleRect(el); if (rect) setTargetRect(rect); }
		}
		window.addEventListener("scroll", onViewportChange, true);
		window.addEventListener("resize", onViewportChange);

		onCleanup(() => {
			mounted = false;
			if (pollInterval) clearInterval(pollInterval);
			window.removeEventListener("scroll", onViewportChange, true);
			window.removeEventListener("resize", onViewportChange);
		});
	});

	function next() {
		if (step() === 5 && !resourceDone()) return;
		if (step() === 6 && !channelDone()) return;
		if (step() < steps().length - 1) setStep((s) => s + 1);
	}
	function prev() { if (step() > 0) setStep((s) => s - 1); }
	function dismiss() { setDismissed(true); }

	const rect = () => {
		const r = targetRect();
		if (!r) return null;
		return { left: r.left - PADDING, top: r.top - PADDING, right: r.right + PADDING, bottom: r.bottom + PADDING, width: r.width + PADDING * 2, height: r.height + PADDING * 2 };
	};

	const placement = () => currentStep().placement ?? "bottom";

	const tooltipStyle = createMemo(() => {
		const r = rect();
		if (!r) return { display: "none" as const };
		const p = placement();
		const stepDef = currentStep();
		const gap = 12, TW = stepDef.tooltipWidth ?? 360, TH = stepDef.tooltipHeight ?? 280, MARGIN = 16;
		let left = MARGIN, top = MARGIN;
		switch (p) {
			case "bottom": left = r.left + r.width / 2 - TW / 2; top = r.bottom + gap; break;
			case "top": left = r.left + r.width / 2 - TW / 2; top = r.top - gap - TH; break;
			case "left": left = Math.max(MARGIN, r.left - 180 - gap - TW); top = Math.max(MARGIN, r.top + r.height / 2 - TH / 2); break;
			case "right": left = r.right + gap; top = r.top + r.height / 2 - TH / 2; break;
		}
		left = Math.max(MARGIN, Math.min(left, window.innerWidth - TW - MARGIN));
		top = Math.max(MARGIN, Math.min(top, window.innerHeight - TH - MARGIN));
		return { left: `${left}px`, top: `${top}px` };
	});

	const tourSteps = () => steps();

	return (
		<>
			<button
				type="button"
				onClick={() => {
					if (!confirm("Reset app to fresh state? This will delete everything.")) return;
					localStorage.clear();
					setDismissed(false);
					try { indexedDB.deleteDatabase("macrograph-editor"); } catch {}
					setTimeout(() => window.location.reload(), 200);
				}}
				class="fixed bottom-2 right-2 z-[9999] text-[10px] text-neutral-700 hover:text-neutral-500 transition-colors"
				title="Debug: reset app to fresh state"
			>
				debug: reset
			</button>
			<Show when={show()}>
				<Show when={needsTarget() && rect()} keyed>
					{(r) => (
						<>
							<BackdropPanel top={0} left={0} width={window.innerWidth} height={r.top} />
							<BackdropPanel top={r.bottom} left={0} width={window.innerWidth} height={window.innerHeight - r.bottom} />
							<BackdropPanel top={r.top} left={0} width={r.left} height={r.height} />
							<BackdropPanel top={r.top} left={r.right} width={window.innerWidth - r.right} height={r.height} />
							<div class="fixed pointer-events-none z-[41]" style={{ top: `${r.top}px`, left: `${r.left}px`, width: `${r.width}px`, height: `${r.height}px`, boxShadow: "inset 0 0 0 1.5px rgba(52, 211, 153, 0.6), 0 0 20px rgba(52, 211, 153, 0.15)", borderRadius: "4px" }} />
						</>
					)}
				</Show>

				<Show when={!isWelcome() && !isComplete()}>
					<div class="fixed z-[60] w-[360px] bg-background border border-border rounded-lg shadow-2xl shadow-black/50 animate-in fade-in zoom-in-95 duration-150" style={tooltipStyle()}>
						{tooltipArrow(placement())}
						<div class="p-4 pb-3 border-b border-border">
							<div class="flex items-center justify-between mb-2">
								<span class="text-xs font-medium text-muted-foreground">Step {step()} of {tourSteps().length - 2}</span>
								<button type="button" onClick={dismiss} class="text-xs text-muted-foreground hover:text-foreground transition-colors">Skip tour</button>
							</div>
							<div class="flex items-center gap-1">
								<For each={tourSteps().slice(1, -1)}>{(s, i) => <div class={clsx("h-1 flex-1 rounded-full transition-colors duration-300", i() + 1 < step() ? "bg-emerald-500" : i() + 1 === step() ? "bg-emerald-500/60" : "bg-border")} />}</For>
							</div>
						</div>
						<div class="p-4">
							<h3 class="text-sm font-semibold leading-none tracking-tight text-foreground">{currentStep().title}</h3>
							<p class="text-sm text-muted-foreground mt-1.5 leading-relaxed">{currentStep().description}</p>
						</div>
						<div class="px-4 pb-4 flex items-center justify-between gap-3">
							<Button variant="ghost" size="sm" onClick={prev} disabled={step() <= 1}>Back</Button>
							<div class="flex items-center gap-2">
								<Button variant="outline" size="sm" onClick={dismiss}>Skip</Button>
							<Show when={step() < tourSteps().length - 2} fallback={<Button size="sm" onClick={dismiss}>Done</Button>}>
								<Show when={step() !== 1 && step() !== 4}>
									<Button size="sm" onClick={next} disabled={step() === 5 && !resourceDone() || step() === 6 && !channelDone()}>Next</Button>
								</Show>
							</Show>
							</div>
						</div>
					</div>
				</Show>

				<Show when={isWelcome()}>
					<div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
						<div class="bg-background border border-border rounded-lg shadow-2xl w-full max-w-md mx-4 p-6">
							<div class="flex flex-col items-center text-center gap-4">
							<img src={appIcon} class="w-14 h-14" alt="MacroGraph" />
							<div>
								<h1 class="text-lg font-semibold text-foreground">Welcome to MacroGraph</h1>
									<p class="text-sm text-muted-foreground mt-1.5 leading-relaxed">A powerful node-based automation tool for streamers and creators. This tour will build a Twitch chat bot together.</p>
								</div>
							</div>
							<div class="flex items-center justify-end gap-2 mt-6">
								<Button variant="outline" size="sm" onClick={dismiss}>Skip</Button>
								<Button size="sm" onClick={() => setStep(1)}>Start Tour</Button>
							</div>
						</div>
					</div>
				</Show>

				<Show when={isComplete()}>
					<div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
						<div class="bg-background border border-border rounded-lg shadow-2xl w-full max-w-md mx-4 p-6">
							<div class="flex flex-col items-center text-center gap-4">
							<img src={appIcon} class="w-14 h-14" alt="MacroGraph" />
							<div>
								<h1 class="text-lg font-semibold text-foreground">{currentStep().title}</h1>
						<Show when={typeof currentStep().description === "string"} fallback={<p class="text-sm text-muted-foreground mt-1.5 leading-relaxed">{(currentStep().description as () => any)()}</p>}>
							<p class="text-sm text-muted-foreground mt-1.5 leading-relaxed">{currentStep().description as string}</p>
						</Show>
								</div>
							</div>
							<div class="flex items-center justify-end gap-2 mt-6">
								<Button size="sm" onClick={dismiss}>Get Started</Button>
							</div>
						</div>
					</div>
				</Show>
			</Show>
		</>
	);
}
