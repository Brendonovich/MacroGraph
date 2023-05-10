import { Procedures } from "@macrograph/core";
import { createSolidQueryHooks } from "@rspc/solid";
import { QueryClient } from "@tanstack/solid-query";

export const rspc = createSolidQueryHooks<Procedures>();
export const queryClient = new QueryClient();
