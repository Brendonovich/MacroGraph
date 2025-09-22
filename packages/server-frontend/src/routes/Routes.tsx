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
				component: () => <Navigate href="server" />,
			},
			{
				path: "/server",
				component: lazy(() => import("./settings/server")),
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
		],
		component: lazy(() => import("./packages")),
	},
];
