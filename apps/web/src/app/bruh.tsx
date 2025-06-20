import { createResource } from "solid-js";
import { HydrationScript, Suspense } from "solid-js/web";

export function Test() {
  const [data] = createResource(
    () =>
      new Promise<string>((resolve) => setTimeout(() => resolve("Data"), 1000)),
  );

  return (
    <div>
      <script src="/src/app/bruh.tsx" type="module" async></script>
      <HydrationScript />
      <p>Static</p>
      <Suspense fallback="Loading...">{data()}</Suspense>
    </div>
  );
}
