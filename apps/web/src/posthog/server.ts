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
  "user signed up": undefined;
  "user logged in": undefined;
  "credential connected": {
    providerId: string;
    providerUserId: string;
  };
  "credential refreshed": {
    providerId: string;
    providerUserId: string;
  };
};

export function posthogIdentify(userId: string, properties: { email: string }) {
  return posthogServer.identify({ distinctId: userId, properties });
}

export function posthogCapture<T extends keyof PostHogEvent>(
  props: Omit<EventMessage, "event" | "properties"> & {
    event: T;
  } & (PostHogEvent[T] extends undefined
      ? {}
      : { properties: PostHogEvent[T] }),
) {
  return posthogServer.capture(props);
}

export function posthogShutdown() {
  return posthogServer.shutdown();
}
