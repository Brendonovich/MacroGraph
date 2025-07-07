import { StartClient, mount } from "@solidjs/start/client";
import posthog from "posthog-js";

mount(() => <StartClient />, document.getElementById("app")!);

posthog.init("phc_7anSDyS3p1frzGL7bHWlkiNG8kJ9pxcHB8H7QjBMEMB", {
	api_host: "https://us.i.posthog.com",
	person_profiles: "identified_only",
});
