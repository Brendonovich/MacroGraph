import { createClient } from "@rspc/client";
import { TauriTransport } from "@rspc/tauri";
import { Procedures } from "./core";

export const rspcClient = createClient<Procedures>({
  transport: new TauriTransport(),
});
