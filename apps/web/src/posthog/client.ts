import posthog from "posthog-js";

export const posthogClient = posthog.init(
  "phc_7anSDyS3p1frzGL7bHWlkiNG8kJ9pxcHB8H7QjBMEMB",
  {
    api_host: "https://us.i.posthog.com",
    person_profiles: "identified_only",
  },
);
