import { Button, DropdownMenuTrigger, buttonVariants } from "@macrograph/ui";
// import { createIntervalCounter } from "@solid-primitives/timer";
import { For, type ValidComponent } from "solid-js";
// import { Transition } from "solid-transition-group";

import { clientOnly } from "@solidjs/start";
import Screenshot from "~/assets/App Logo.png";
import { HeaderAuthFallback } from "../HeaderAuthSection";
import { Logo } from "../Logo";
import { DesktopDownloadDropdown } from "./DesktopDownloadDropdown";
import { Socials } from "./Socials";

const AuthSection = clientOnly(() =>
  import("../HeaderAuthSection").then((i) => ({
    default: i.HeaderAuthSection,
  })),
);

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
    <div class="flex flex-col items-center">
      <header class="h-12 flex flex-row justify-between p-2 w-full items-center">
        <Logo />
        <AuthSection fallback={<HeaderAuthFallback />} />
      </header>
      <div class="flex flex-col items-center justify-center max-w-4xl p-8">
        <div class="flex flex-row justify-center items-center gap-4 mt-20">
          <img
            src={Screenshot}
            class="w-28 md:w-40"
            alt="MacroGraph App Icon"
          />
          <div class="space-y-1">
            <h1 class="font-black text-4xl md:text-6xl">MacroGraph</h1>
            <p class="text-yellow-500 text-xl md:text-3xl">
              Visual programming for streamers
            </p>
          </div>
        </div>
        <p class="max-w-2xl text-neutral-300 text-center my-1">
          MacroGraph provides a node-based programming environment for streamers
          to build custom interactions and automations. It acts as glue between
          your services and programs, taking care of connecting to them so you
          can focus on creating.
        </p>
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
          <a href="/playground" class={buttonVariants({ size: "lg" })}>
            <IconTablerSandbox class="size-5 mr-2" />
            Playground
          </a>
          <DesktopDownloadDropdown placement="bottom">
            <DropdownMenuTrigger<ValidComponent>
              as={(props) => <Button {...props} size="lg" />}
            >
              <IconTablerDeviceDesktopDown class="size-5 mr-2" />
              Download
              <IconTablerChevronDown class="ml-2 size-5" />
            </DropdownMenuTrigger>
          </DesktopDownloadDropdown>
          {/*<a href="/documentation" class={buttonVariants({ size: "lg" })}>
            <IconMaterialSymbolsBook4 class="size-5 mr-2" />
            Documentation
          </a> */}
        </div>
        <div class="flex flex-row mt-4">
          <Socials iconClass="size-9" />
        </div>

        <h2 class="font-bold text-3xl mt-32">Integrations</h2>
        <p class="text-neutral-300 mt-1 text-center">
          MacroGraph can receive events from and send commands to all sorts of
          programs and services
        </p>
        <div class="grid mt-4 grid-cols-1 md:grid-cols-2 gap-2 w-full">
          <For each={INTEGRATIONS}>
            {(item) => (
              <div class="bg-black/30 p-4 rounded-lg flex flex-row gap-3 items-center hover:scale-[1.02] border transition-transform">
                <img
                  class="size-16 object-contain rounded text-white fill-current"
                  src={getLogo(item.logo)}
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

const logos = import.meta.glob<{ default: string }>("./logos/*", {
  eager: true,
});
const getLogo = (file: string) => logos[`./logos/${file}`].default;

const INTEGRATIONS = [
  {
    name: "OBS",
    description: "Modify and listen to changes in all aspects of OBS",
    logo: "obs.png",
  },
  {
    name: "Twitch",
    description: "Interact with Chat, EventSub, and Helix",
    logo: "twitch.png",
  },
  {
    name: "VTube Studio",
    description: "Execute hotkeys and control models",
    logo: "vtube-studio.png",
  },
  {
    name: "Streamlabs",
    description: "Listen for donations and YouTube events",
    logo: "streamlabs.png",
  },
  {
    name: "Discord",
    description: "Send and receive messages, and interact with the Discord API",
    logo: "discord.png",
  },
  {
    name: "Speaker.bot",
    description: "Trigger and stop text-to-speech",
    logo: "speaker-bot.svg",
  },
  {
    name: "WebSockets",
    description: "Connect to WebSocket servers and host your own",
    logo: "websockets.webp",
  },
  {
    name: "GoXLR",
    description: "Control and listen to buttons, dials, faders, and channels",
    logo: "goxlr.png",
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
    logo: "stream-deck.jpg",
  },
  {
    name: "MIDI",
    description: "Send and receive MIDI messages to and from MIDI devices",
    logo: "midi.svg",
  },
  {
    name: "OpenAI",
    description: "Generate text with ChatGPT and images with Dall-E",
    logo: "openai.png",
  },
];
