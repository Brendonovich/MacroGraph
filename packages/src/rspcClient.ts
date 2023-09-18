import { createClient } from "@rspc/client";
import { TauriTransport } from "@rspc/tauri";
import { Procedures } from "@macrograph/core";

export const rspcClient = createClient<Procedures>({
  transport: new TauriTransport(),
});
