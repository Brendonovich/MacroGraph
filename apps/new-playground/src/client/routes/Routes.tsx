import { Navigate, RouteDefinition } from "@solidjs/router";
import { lazy, Show } from "solid-js";
import { useProjectContext } from "../Project/Context";

export const routes: RouteDefinition[] = [
  {
    path: "/",
    component: lazy(() => import("./index")),
  },
  {
    path: "/packages",
    children: [
      {
        path: "/",
        component: () => {
          const { packages } = useProjectContext();

          return (
            <Show when={Object.keys(packages)[0]}>
              {(href) => <Navigate href={href()} />}
            </Show>
          );
        },
      },
      {
        path: "/:package",
        component: lazy(() => import("./packages.[package]")),
      },
    ],
    component: lazy(() => import("./packages")),
  },
];
