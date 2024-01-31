import { ParentProps } from "solid-js";
import { A } from "@solidjs/router";

export default function (props: ParentProps) {
  return (
    <div class="w-full h-full flex flex-row">
      <nav class="h-full flex flex-col border-r border-neutral-800 gap-2">
        <div class="flex flex-row items-baseline gap-2 px-4 py-2">
          <a class="text-3xl font-black" href="/">
            MacroGraph
          </a>
        </div>

        <div class="flex flex-col gap-2 px-4 flex-1">
          {[
            ["/projects", "Projects"],
            ["/credentials", "Credentials"],
            ["/account", "Account"],
          ].map(([href, name]) => (
            <A
              end={href === "/"}
              href={href}
              class="px-2 py-1 rounded-lg"
              activeClass="bg-neutral-800"
            >
              {name}
            </A>
          ))}
        </div>

        {/* <div class="flex flex-row items-center justify-end gap-2 px-4 py-2 h-full">
          <a
            class="underline hover:text-violet-500 transition-colors"
            target="_blank"
            href="https://discord.gg/FEyYaC8v53"
          >
            Discord
          </a>
          <a
            class="underline hover:text-blue-400 transition-colors"
            target="_blank"
            href="https://github.com/brendonovich/macrograph"
          >
            GitHub
          </a>
        </div> */}
      </nav>

      <main class="w-full flex-1 flex flex-col justify-center items-center overflow-y-hidden">
        <div class="h-full w-full max-w-3xl p-4">{props.children}</div>
      </main>
    </div>
  );
}
