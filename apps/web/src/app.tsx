// @refresh reload
import { MetaProvider, Title } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { clientOnly } from "@solidjs/start";
import { FileRoutes } from "@solidjs/start/router";
import { ErrorBoundary, Suspense } from "solid-js";
import { Toaster } from "solid-sonner";

// import "unfonts.css";
import "@macrograph/ui/global.css";

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
