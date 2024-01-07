import { ssr, ssrHydrationKey } from 'file:///Users/brendonovich/github.com/brendonovich/macrograph/node_modules/.pnpm/solid-js@1.8.8/node_modules/solid-js/web/dist/server.js';

const a = ["<header", ' class="w-full flex flex-row px-4 py-2 justify-between items-center"><div class="flex flex-row items-baseline gap-2"><h1 class="text-3xl font-black"><a href="/">MacroGraph</a></h1><span>By <a class="underline hover:text-yellow-400 transition-colors" target="_blank" href="https://www.brendonovich.dev">Brendonovich</a></span></div><div class="flex flex-row items-baseline gap-2"><a class="underline hover:text-violet-500 transition-colors" target="_blank" href="https://discord.gg/FEyYaC8v53">Discord</a><a class="underline hover:text-blue-400 transition-colors" target="_blank" href="https://github.com/brendonovich/macrograph">GitHub</a></div></header>'], r = ["<main", ' class="flex-1 w-full bg-neutral-800 overflow-hidden"></main>'];
function s() {
  return [ssr(a, ssrHydrationKey()), ssr(r, ssrHydrationKey())];
}

export { s as default };
//# sourceMappingURL=index.mjs.map
