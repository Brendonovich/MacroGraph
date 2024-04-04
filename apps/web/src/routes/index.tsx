import { clientOnly } from "@solidjs/start";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

const Editor = clientOnly(() => import("../Editor"));

export default function Index() {
  return (
    <div class="w-screen h-screen bg-neutral-900 text-white flex flex-col">
      <Header />
      <main class="flex-1 w-full bg-neutral-800 overflow-hidden">
        <Editor />
      </main>
    </div>
  );
}

import IconIcBaselineDiscord from "~icons/ic/baseline-discord.jsx";
import IconMdiGithub from "~icons/mdi/github.jsx";
import IconTablerChevronDown from "~icons/tabler/chevron-down.jsx";
import { Button } from "~/components/ui/button";
import { For } from "solid-js";
import { As } from "@kobalte/core";

async function getLatestVersion(target: string) {
  "use server";

  const res = await fetch(
    `https://cdn.crabnebula.app/update/macrograph/macrograph/${target}/latest`
  );

  const { version } = (await res.json()) as { version: string };

  return version;
}

interface DownloadOption {
  name: string;
  target: string;
  getAssetName: (version: string) => string;
}

const DownloadOptions = [
  {
    name: "Windows",
    target: "windows-x86_64",
    getAssetName: (version) => `MacroGraph_${version}_x64_en-US.msi`,
  },
  {
    name: "macOS (Apple Silicon)",
    target: "darwin-aarch64",
    getAssetName: (version) => `MacroGraph_${version}_aarch64.dmg`,
  },
  {
    name: "macOS (Intel)",
    target: "darwin-x86_64",
    getAssetName: (version) => `MacroGraph_${version}_x64.dmg`,
  },
  {
    name: "Linux (AppImage)",
    target: "linux-x86_64",
    getAssetName: (version) => `macro-graph_${version}_amd64.AppImage`,
  },
  {
    name: "Linux (deb)",
    target: "linux-x86_64",
    getAssetName: (version) => `macro-graph_${version}_amd64.deb`,
  },
] satisfies Array<DownloadOption>;

function Header() {
  return (
    <header class="w-full flex flex-row px-4 py-2 justify-between items-center">
      <div class="flex flex-row items-baseline gap-2">
        <h1 class="text-3xl font-black">
          <a href="/">MacroGraph</a>
        </h1>
        <span>
          By{" "}
          <a
            class="underline hover:text-yellow-400 transition-colors"
            target="_blank"
            href="https://www.brendonovich.dev"
          >
            Brendonovich
          </a>
        </span>
      </div>

      <div class="flex flex-row items-center gap-3">
        <DropdownMenu placement="bottom-end">
          <DropdownMenuTrigger asChild>
            <As
              component={Button}
              class="flex-row flex items-center gap-1"
              size="sm"
            >
              <span>Download for Desktop</span>
              <IconTablerChevronDown class="w-5 h-5" />
            </As>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <For each={DownloadOptions}>
              {(option) => (
                <DropdownMenuItem
                  onSelect={() => {
                    getLatestVersion(option.target).then((version) => {
                      window.open(
                        `https://cdn.crabnebula.app/download/macrograph/macrograph/latest/${option.getAssetName(
                          version
                        )}`
                      );
                    });
                  }}
                >
                  {option.name}
                </DropdownMenuItem>
              )}
            </For>
          </DropdownMenuContent>
        </DropdownMenu>
        <a
          class="hover:text-[#7289da]"
          target="_blank"
          href="https://discord.gg/FEyYaC8v53"
        >
          <IconIcBaselineDiscord class="w-7 h-7" />
        </a>
        <a
          class="hover:text-[#4078c0]"
          target="_blank"
          href="https://github.com/brendonovich/macrograph"
        >
          <IconMdiGithub class="w-7 h-7" />
        </a>
      </div>
    </header>
  );
}
