import { Button, DropdownMenuTrigger, buttonVariants } from "@macrograph/ui";
// import { createIntervalCounter } from "@solid-primitives/timer";
import { For, type ValidComponent } from "solid-js";
// import { Transition } from "solid-transition-group";

import Screenshot from "../assets/App Logo.png";
import { DesktopDownloadDropdown } from "./DesktopDownloadDropdown";
import { Socials } from "./Socials";

export default function () {
	// const eventCounter = createIntervalCounter(2000);

	// const eventSource = () => {
	//   let text;

	//   switch (eventCounter() % 3) {
	//     case 0: {
	//       text = "Twitch";
	//       break;
	//     }
	//     case 1: {
	//       text = "OBS";
	//       break;
	//     }
	//     case 2: {
	//       text = "MacroGraph";
	//       break;
	//     }
	//   }

	//   return <div>{text}</div>;
	// };

	return (
		<div class="flex flex-col items-center overflow-x-hidden overflow-y-hidden">
			<div class="flex flex-col items-center justify-center max-w-4xl">
				<div class="flex flex-row justify-center items-center gap-4 mt-32">
					<img src={Screenshot} class="w-40" alt="MacroGraph App Icon" />
					<div class="space-y-1">
						<h1 class="font-black text-6xl">MacroGraph</h1>
						<p class="text-yellow-500 text-3xl">
							Visual programming for streamers
						</p>
					</div>
				</div>
				{/* <p class="max-w-2xl text-neutral-300 text-center my-1">
          MacroGraph provides a node-based programming environment for streamers
          to create custom interactions and automations. It acts as glue between
          your services and programs, taking care of connecting to them so you
          can focus on creating.
        </p> */}
				{/* <div class="grid grid-cols-3 grid-rows-2 text-2xl font-medium my-4 gap-x-1 max-w-md w-full">
        <span class="text-right col-span-2">Receive events from </span>
        <div class="overflow-hidden col-span-1 font-bold">
          <Transition
            mode="outin"
            enterClass="-translate-y-4"
            enterActiveClass="transition-transform duration-200"
            enterToClass="translate-y-0"
            exitClass="translate-y-0"
            exitActiveClass="transition-transform duration-200"
            exitToClass="translate-y-4"
            appear={false}
          >
            {eventSource()}
          </Transition>
        </div>
        <span class="text-right col-span-2">Send commands to</span>
        <div class="overflow-hidden col-span-1 font-bold">
          <Transition
            mode="outin"
            enterClass="-translate-y-4"
            enterActiveClass="transition-transform duration-200"
            enterToClass="translate-y-0"
            exitClass="translate-y-0"
            exitActiveClass="transition-transform duration-200"
            exitToClass="translate-y-4"
            appear={false}
          >
            {eventSource()}
          </Transition>
        </div>
      </div> */}
				<div class="mt-4 space-x-4 flex flex-row">
					<a href="/" class={buttonVariants({ size: "lg" })}>
						<IconTablerSandbox class="size-5 mr-2" />
						Playground
					</a>
					<DesktopDownloadDropdown placement="bottom">
						<DropdownMenuTrigger<ValidComponent>
							as={(props) => <Button {...props} size="lg" />}
						>
							Download
							<IconTablerChevronDown class="ml-2 size-5" />
						</DropdownMenuTrigger>
					</DesktopDownloadDropdown>
					{/* <a href="/documentation" class={buttonVariants({ size: "lg" })}>
            <IconMaterialSymbolsBook4 class="size-5 mr-2" />
            Documentation
          </a> */}
				</div>
				<div class="flex flex-row mt-4">
					<Socials iconClass="size-9" />
				</div>

				<h2 class="font-bold text-3xl mt-32">Integrations</h2>
				<p class="text-neutral-300 text-md mt-1">
					MacroGraph can receive events from and send commands to all sorts of
					programs and services
				</p>
				<div class="grid grid my-4 grid-cols-2 gap-2">
					<For
						each={[
							{
								name: "OBS",
								description:
									"Modify and listen to changes in all aspects of OBS",
								logo: "https://styles.redditmedia.com/t5_2wfse/styles/communityIcon_hbfqltc7u6l01.png",
							},
							{
								name: "Twitch",
								description: "Interact with Chat, EventSub, and Helix",
								logo: "https://static-00.iconduck.com/assets.00/twitch-color-icon-439x512-2jadj7kg.png",
							},
							{
								name: "VTube Studio",
								description: "Execute hotkeys and control models",
								logo: "https://raw.githubusercontent.com/wiki/DenchiSoft/VTubeStudio/logo/vts_logo_transparent.png",
							},
							{
								name: "Streamlabs",
								description: "Listen for donations and YouTube events",
								logo: "https://styles.redditmedia.com/t5_kc99n/styles/communityIcon_lxibp9fwz1a71.png",
							},
							{
								name: "Discord",
								description:
									"Send and receive messages, and interact with the Discord API",
								logo: "https://mp-cdn.elgato.com/media/e3559f36-d31d-4529-ab1f-739955e2ac7a/8ec91fa3-3a50-4041-b53a-dae3eff7fbdf/Discord-app-icon-optimized-d5ad8eb3-8962-42de-957d-2df56569b574.png",
							},
							{
								name: "Speaker.bot",
								description: "Trigger and stop text-to-speech",
								logo: "https://speaker.bot/logo.svg",
							},
							{
								name: "WebSockets",
								description: "Connect to WebSocket servers and host your own",
								logo: "https://logodix.com/logo/1825971.png",
							},
							{
								name: "GoXLR",
								description:
									"Control and listen to buttons, dials, faders, and channels",
								logo: "https://mp-cdn.elgato.com/media/d30b9add-2aad-43e1-800c-f02e15c20b63/d8311a0b-39e8-4038-8e4e-b8404d267d74/GoXLR_Plugin-app-icon-optimized-87a1f2d5-42ba-4c83-ac02-5fbd2946d917.png",
							},
							{
								name: "Elgato Stream Deck",
								description: (
									<>
										Listen to button presses via the{" "}
										<a
											href="https://marketplace.elgato.com/product/websocket-proxy-5ed6a37a-d6e9-4c95-aa95-42ded37ecff1"
											target="_blank"
											rel="noopener noreferrer"
											class="underline"
										>
											WebSocket Proxy plugin
										</a>
									</>
								),
								logo: "https://pbs.twimg.com/profile_images/1600655159687716864/Je9m8YDl_400x400.jpg",
							},
							{
								name: "MIDI",
								description:
									"Send and receive MIDI messages to and from MIDI devices",
								logo: "data:image/svg+xml,%3c?xml%20version='1.0'%20encoding='utf-8'?%3e%3csvg%20version='1.1'%20width='1000'%20height='455'%20viewBox='0%200%201000%20455'%20xmlns='http://www.w3.org/2000/svg'%20xmlns:xlink='http://www.w3.org/1999/xlink'%20xml:space='preserve'%3e%3cpath%20fill='%23FFFFFF'%20aria-label='M'%20text-data='M'%20d='M137,96h233c19.6,0,31,16.9,31,37v229h-65V163h-38v199h-59V163h-37v199h-65V96z'/%3e%3crect%20fill='%23FFFFFF'%20aria-label='I'%20text-data='I'%20x='433'%20y='96'%20width='65'%20height='266'/%3e%3cpath%20fill='%23FFFFFF'%20aria-label='D'%20text-data='D'%20d='M529,96h193c19.6,0,31,16.9,31,37v196c0,24.9-10.4,33-33,33H529V193h66v104h93V156H529V96z'/%3e%3crect%20fill='%23FFFFFF'%20aria-label='I'%20text-data='I'%20x='783'%20y='96'%20width='66'%20height='266'/%3e%3c/svg%3e",
							},
						]}
					>
						{(item) => (
							<div class="bg-black/30 p-4 rounded-lg flex flex-row gap-3 items-center hover:scale-[1.02] border transition-transform">
								<img
									class="size-16 object-contain rounded"
									src={item.logo}
									alt={`${item.name} Logo`}
								/>
								<div>
									<span class="font-bold text-lg">{item.name}</span>
									<p class="text-neutral-300 text-sm">{item.description}</p>
								</div>
							</div>
						)}
					</For>
				</div>
			</div>
		</div>
	);
}
