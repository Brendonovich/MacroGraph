import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
  start: {
    ssr: "async",
    solid: {} as any,
    server: {
      preset: "vercel",
      prerender: {
        crawlLinks: true,
      },
    },
  },
});
