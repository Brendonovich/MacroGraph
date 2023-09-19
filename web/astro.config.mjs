import { defineConfig } from "astro/config";
import solid from "@astrojs/solid-js";
import unocss from "unocss/astro";
import vercel from "@astrojs/vercel/serverless";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  integrations: [
    solid(),
    tailwind(),
    unocss({
      injectReset: true,
    }),
  ],
  output: "hybrid",
  adapter: vercel(),
});
