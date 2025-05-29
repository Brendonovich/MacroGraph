import { StartClient, mount } from "@solidjs/start/client";
import "./posthog/client";

mount(() => <StartClient />, document.getElementById("app")!);
