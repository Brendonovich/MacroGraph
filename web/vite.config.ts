import { defineConfig } from "@solidjs/start/config";

export default defineConfig({
  start: {
    ssr: "async",
    server: {
      prerender: {
        crawlLinks: true,
      },
    },
  },
});
