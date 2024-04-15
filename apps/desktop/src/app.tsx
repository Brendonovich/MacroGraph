import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import "@macrograph/ui/global.css";

import { rspc, client, queryClient } from "./rspc";
import "./app.css";
import { Suspense } from "solid-js";
import { Toaster } from "solid-sonner";

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
