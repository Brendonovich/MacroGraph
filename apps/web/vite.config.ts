import { defineConfig } from "@solidjs/start/config";
import interfacePlugin from "../../interface/vite";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

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
