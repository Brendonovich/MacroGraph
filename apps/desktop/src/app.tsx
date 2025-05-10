import "@macrograph/ui/global.css";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { Toaster } from "solid-sonner";

import { client, queryClient, rspc } from "./rspc";

import "./app.css";

export default function App() {
	return (
		<Router
			root={(props) => (
				<rspc.Provider client={client} queryClient={queryClient}>
					<Suspense>{props.children}</Suspense>
					<Toaster />
				</rspc.Provider>
			)}
		>
			<FileRoutes />
		</Router>
	);
}
