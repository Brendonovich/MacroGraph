import { Procedures } from "@macrograph/core";
import { createClient } from "@rspc/client";
import { createSolidQueryHooks } from "@rspc/solid";
import { TauriTransport } from "@rspc/tauri";
import { QueryClient } from "@tanstack/solid-query";

export const client = createClient<Procedures>({
  transport: new TauriTransport(),
});

export const rspc: ReturnType<typeof createSolidQueryHooks<Procedures>> =
  createSolidQueryHooks<Procedures>();
export const queryClient = new QueryClient();
