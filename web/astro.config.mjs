import { defineConfig } from "astro/config";
import solid from "@astrojs/solid-js";
import unocss from "unocss/astro";
import vercel from "@astrojs/vercel/serverless";

export default defineConfig({
  integrations: [
    unocss({
      injectReset: true,
    }),
    solid(),
  ],
  output: "hybrid",
  adapter: vercel(),
});
