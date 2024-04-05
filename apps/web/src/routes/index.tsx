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
import { appendResponseHeader } from "vinxi/http";
import { cache } from "@solidjs/router";
import { DownloadTarget, getDownloadURL } from "~/lib/releases";

const getDownloadURL_cached = cache((target: DownloadTarget) => {
  "use server";

  appendResponseHeader("CDN-Cache-Control", `public, max-age=${60 * 60 * 24}`);

  return getDownloadURL(target);
}, "getLatestVersion");

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
            <For
              each={
                [
                  ["windows-x86_64", "Windows"],
                  ["darwin-aarch64", "macOS (Apple Silicon)"],
                  ["darwin-x86_64", "macOS (Intel)"],
                  ["linux-x86_64-AppImage", "Linux (AppImage)"],
                  ["linux-x86_64-deb", "Linux (deb)"],
                ] satisfies Array<[DownloadTarget, string]>
              }
            >
              {([target, name]) => (
                <DropdownMenuItem
                  onSelect={() =>
                    getDownloadURL_cached(target).then((url) =>
                      window.open(url)
                    )
                  }
                >
                  {name}
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
