import { PostHog } from "posthog-node";

export const posthogServer = new PostHog(
  "phc_7anSDyS3p1frzGL7bHWlkiNG8kJ9pxcHB8H7QjBMEMB",
  { host: "https://us.i.posthog.com", disabled: import.meta.env.DEV },
);
