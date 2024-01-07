import { createClient } from "@rspc/client";
import { createSolidQueryHooks } from "@rspc/solid";
import { TauriTransport } from "@rspc/tauri";
import { QueryClient } from "@tanstack/solid-query";
import { Procedures } from "./types";

export const client = createClient<Procedures>({
  transport: new TauriTransport(),
});

export const rspc: ReturnType<typeof createSolidQueryHooks<Procedures>> =
  createSolidQueryHooks<Procedures>();
export const queryClient = new QueryClient();
