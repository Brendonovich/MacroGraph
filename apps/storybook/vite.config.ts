import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

import interfacePlugin from "../../interface/vite";

export default defineConfig({
	plugins: [solid(), interfacePlugin],
});
