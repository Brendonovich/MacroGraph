import { contract } from "@macrograph/api-contract";
import {
	ConfigDialog,
	ConnectionsDialog,
	Interface,
	PlatformContext,
} from "@macrograph/interface";
import * as pkgs from "@macrograph/packages";
import { Core } from "@macrograph/runtime";
import {
	deserializeProject,
	serde,
	serializeProject,
} from "@macrograph/runtime-serde";
import { AsyncButton, Button } from "@macrograph/ui";
import { useAction, useSearchParams } from "@solidjs/router";
import { initClient } from "@ts-rest/core";
import { Show, createSignal, onMount } from "solid-js";
import { toast } from "solid-sonner";
import * as v from "valibot";
import { HttpApiClient } from "@effect/platform";
import { Api } from "@macrograph/web-api";

import { fetchPlaygroundProject, savePlaygroundProject } from "~/api";
import { clientEnv } from "~/env/client";

const AUTH_URL = `${clientEnv.VITE_VERCEL_URL}/auth`;

export const api = initClient(contract, {
	baseUrl: "api",
	baseHeaders: {},
});

const core = new Core({
	fetch,
	oauth: {
		authorize: async (provider) => {
			const loginWindow = window.open(
				`${AUTH_URL}/${provider}/login?${new URLSearchParams({
					state: window.btoa(
						JSON.stringify({
							env: "web",
							targetOrigin: window.origin,
						}),
					),
				})}`,
			);

			if (!loginWindow) {
				return null;
			}

			return await new Promise<any>((res) =>
				window.addEventListener("message", (e) => {
					if (e.source !== loginWindow) return;

					res({ ...e.data, issued_at: Date.now() / 1000 });
				}),
			);
		},
		refresh: async (provider, refreshToken) => {
			const res = await fetch(`${AUTH_URL}/${provider}/refresh`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ refreshToken }),
			});

			return {
				...((await res.json()) as any),
				issued_at: Date.now() / 1000,
			};
		},
	},
	api,
});

[
	pkgs.github.pkg,
	pkgs.google.pkg,
	pkgs.goxlr.pkg,
	pkgs.json.pkg,
	pkgs.keyboard.pkg,
	pkgs.list.pkg,
	pkgs.localStorage.pkg,
	pkgs.logic.pkg,
	pkgs.map.pkg,
	pkgs.obs.pkg,
	pkgs.spotify.pkg,
	pkgs.twitch.pkg,
	pkgs.utils.pkg,
	pkgs.openai.pkg,
	pkgs.speakerbot.pkg,
	pkgs.variables.pkg,
	pkgs.customEvents.pkg,
	pkgs.midi.pkg,
	pkgs.vtubeStudio.pkg,
	pkgs.voicemod.pkg,
].map((p) => p && core.registerPackage(p));

export default () => {
	const [loaded, setLoaded] = createSignal(false);
	const [params] = useSearchParams<{ shared?: string }>();

	onMount(async () => {
		if (params.shared) {
			fetchPlaygroundProject(params.shared)
				.then((projectStr) => {
					if (projectStr)
						core.load((c) =>
							deserializeProject(
								c,
								v.parse(serde.Project, JSON.parse(projectStr)),
							),
						);
				})
				.finally(() => {
					setLoaded(true);
				});
		} else {
			const savedProject = localStorage.getItem("project");

			if (savedProject) {
				try {
					await core.load((c) =>
						deserializeProject(
							c,
							v.parse(serde.Project, JSON.parse(savedProject)),
						),
					);
				} catch {}

				// handling this case is IMPORTANT!!!
			}

			setLoaded(true);
		}
	});

	return (
		<Show
			when={loaded() && core.project}
			keyed
			fallback={
				<div class="w-full h-full flex flex-col items-center justify-center text-neutral-300 gap-4">
					<span>Loading project</span> <IconSvgSpinners90Ring class="size-12" />
				</div>
			}
		>
			<PlatformContext.Provider
				value={{
					clipboard: {
						readText: navigator.clipboard.readText,
						writeText: navigator.clipboard.writeText,
					},
				}}
			>
				<Interface core={core} environment="browser" />
			</PlatformContext.Provider>
		</Show>
	);
};

export function ConnectionsDialogButton() {
	return (
		<>
			<ConnectionsDialog core={core} />
			<ConfigDialog />
		</>
	);
}

export function ProjectName() {
	return <>{core.project.name}</>;
}

export function ExportButton() {
	return (
		<Button
			size="icon"
			variant="ghost"
			title="Export Project"
			onClick={() =>
				saveJsonAsFile("project.json", serializeProject(core.project))
			}
		>
			<IconPhExport class="size-5" />
		</Button>
	);
}

export function ShareButton() {
	const createProjectLink = useAction(savePlaygroundProject);

	return (
		<AsyncButton
			size="icon"
			variant="ghost"
			title="Share Project"
			onClick={async () => {
				const id = await createProjectLink(
					JSON.stringify(serializeProject(core.project)),
				);

				navigator.clipboard.writeText(
					new URL(
						`/playground?${new URLSearchParams({ shared: id })}`,
						location.origin,
					).toString(),
				);

				toast("Project link copied to clipboard");
			}}
		>
			<IconIcRoundShare class="size-5" />
		</AsyncButton>
	);
}

// https://stackoverflow.com/a/65939108/5721736
function saveJsonAsFile(filename: string, dataObjToWrite: any) {
	const blob = new Blob([JSON.stringify(dataObjToWrite)], {
		type: "text/json",
	});
	const link = document.createElement("a");

	link.download = filename;
	link.href = window.URL.createObjectURL(blob);
	link.dataset.downloadurl = [
		"application/json",
		link.download,
		link.href,
	].join(":");

	const evt = new MouseEvent("click", {
		view: window,
		bubbles: true,
		cancelable: true,
	});

	link.dispatchEvent(evt);
	link.remove();
}
