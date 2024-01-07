import { defineConfig } from "@solidjs/start/config";
import interfacePlugin from "@macrograph/interface/vite";

export default defineConfig({
  plugins: [interfacePlugin],
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
