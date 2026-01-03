import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const clientEnv = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_VERCEL_URL: z
			.string()
			.optional()
			.transform((d) => (d ? `https://${d}` : "")),
	},
	runtimeEnv: { ...import.meta.env },
});
