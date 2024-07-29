// @refresh reload
import { MetaProvider, Title } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import { Toaster } from "solid-sonner";

// import "unfonts.css";
import "@macrograph/ui/global.css";

export default function App() {
	return (
		<Router
			root={(props) => (
				<MetaProvider>
					<Title>MacroGraph</Title>
					<Suspense>{props.children}</Suspense>
					<Toaster />
				</MetaProvider>
			)}
		>
			<FileRoutes />
		</Router>
	);
}
