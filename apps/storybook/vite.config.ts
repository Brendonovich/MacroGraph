import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

import macrographUI from "../../packages/ui/vite";

export default defineConfig({ plugins: [solid(), macrographUI] });
