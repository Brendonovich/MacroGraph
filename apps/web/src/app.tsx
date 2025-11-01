// @refresh reload
import { MetaProvider, Title } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { ErrorBoundary, Suspense } from "solid-js";
import { Toaster } from "solid-sonner";

import "virtual:uno.css";
import "@unocss/reset/tailwind-compat.css";
import "@macrograph/ui/global.css";

// import "unfonts.css";

// const DesktopListener = clientOnly(() => import("./app/DesktopListener"));

export default function App() {
	return (
		<Router
			root={(props) => (
				<MetaProvider>
					<Title>MacroGraph</Title>
					<Suspense>{props.children}</Suspense>
					<ErrorBoundary fallback={null}>
						{/*<DesktopListener />*/}
					</ErrorBoundary>
					<Toaster />
				</MetaProvider>
			)}
		>
			<FileRoutes />
		</Router>
	);
}
