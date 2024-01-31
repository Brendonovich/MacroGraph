import { defineConfig } from "@solidjs/start/config";
import interfacePlugin from "../../interface/vite";
import "dotenv/config";

export default defineConfig({
  plugins: [interfacePlugin],
  start: {
    solid: {} as any,
    ssr: true,
    server: {
      preset: "vercel",
      prerender: {
        crawlLinks: true,
      },
    },
  },
});
