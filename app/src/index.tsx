/* @refresh reload */
import { render } from "solid-js/web";

import "./index.css";
import App from "./App";
import { queryClient, rspc } from "./rspc";
import { rspcClient } from "@macrograph/core";

render(
  () => (
    <rspc.Provider client={rspcClient} queryClient={queryClient}>
      <App />
    </rspc.Provider>
  ),
  document.getElementById("root") as HTMLElement
);
