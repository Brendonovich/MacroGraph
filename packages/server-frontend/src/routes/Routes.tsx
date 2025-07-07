import { Navigate, type RouteDefinition } from "@solidjs/router";
import { Show, lazy } from "solid-js";

import { useProjectService } from "../AppRuntime";
import { ProjectState } from "../Project/State";

export const routes: RouteDefinition[] = [
	{
		path: "/",
		component: lazy(() => import("./index")),
	},
	{
		path: "/settings",
		component: lazy(() => import("./settings")),
		children: [
			{
				path: "/",
				component: () => <Navigate href="account" />,
			},
			{
				path: "/account",
				component: lazy(() => import("./settings/account")),
			},
		],
	},
	{
		path: "/packages",
		children: [
			{
				path: "/",
				component: () => {
					const { state } = useProjectService(ProjectState);

					return (
						<Show when={Object.keys(state.packages)[0]}>
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
