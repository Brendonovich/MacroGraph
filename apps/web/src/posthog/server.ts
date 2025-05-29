import { EventMessage, PostHog } from "posthog-node";

const posthogServer = new PostHog(
  "phc_7anSDyS3p1frzGL7bHWlkiNG8kJ9pxcHB8H7QjBMEMB",
  {
    host: "https://us.i.posthog.com",
    disabled: import.meta.env.DEV,
    flushAt: 1,
    flushInterval: 0,
  },
);

export type PostHogEvent = {
  "user signed up": {
    email: string;
  };
  "user logged in": {
    email: string;
  };
};

export function posthogCapture<T extends keyof PostHogEvent>(
  props: Omit<EventMessage, "event" | "properties"> & {
    event: T;
    properties: PostHogEvent[T];
  },
) {
  return posthogServer.capture(props);
}

export function posthogShutdown() {
  return posthogServer.shutdown();
}
