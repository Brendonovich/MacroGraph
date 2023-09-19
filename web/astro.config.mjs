import { defineConfig } from "astro/config";
import solid from "@astrojs/solid-js";
import vercel from "@astrojs/vercel/serverless";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  integrations: [solid(), tailwind()],
  output: "hybrid",
  adapter: vercel(),
});
