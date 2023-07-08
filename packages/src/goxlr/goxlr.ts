import { Maybe, Option } from "@macrograph/core";
import {
  createEffect,
  createSignal,
  createRoot,
  on,
  onCleanup,
} from "solid-js";
import pkg from "./pkg";

const URL_LOCALSTORAGE_KEY = "GoXLR_WS";

const { mixerID, url, setUrl, state, setState } = createRoot(() => {
  const [state, setState] = createSignal<
    | {
        type: "disconnected";
      }
    | { type: "connecting" | "connected"; ws: WebSocket }
  >({ type: "disconnected" });

  const [url, setUrl] = createSignal<Option<string>>(
    Maybe(localStorage.getItem("GoXLR_WS"))
  );

  let mixerID: string | undefined;

  createEffect(
    on(
      () => url(),
      (url) =>
        url
          .map((url) => (localStorage.setItem(URL_LOCALSTORAGE_KEY, url), true))
          .unwrapOrElse(
            () => (localStorage.removeItem(URL_LOCALSTORAGE_KEY), false)
          )
    )
  );

  createEffect(
    on(
      () => url(),
      (url) => {
        url.map((url) => {
          const ws = new WebSocket(url);

          ws.addEventListener("open", () => {
            setState({ type: "connected", ws });
            ws.send(
              JSON.stringify({
                id: 0,
                data: "GetStatus",
              })
            );
          });

          ws.addEventListener("message", (data: any) => {
            const status = JSON.parse(data.data).data.Status;
            if (status) {
              mixerID = Object.keys(status.mixers)[0];
              console.log(mixerID);
              return;
            }
            const patch: Array<any> = JSON.parse(data.data).data.Patch;
            patch.forEach((expanded) => {
              const path: string = expanded.path;
              const pathParts = path.substring(1).split("/");
              if (pathParts[2] === "levels") {
                pkg.emitEvent({
                  name: "levelsChange",
                  data: { path: pathParts, value: expanded.value },
                });
              }
              if (pathParts[2] === "button_down") {
                pkg.emitEvent({
                  name: "buttonDown",
                  data: { path: pathParts, value: expanded.value },
                });
              }
              if (pathParts[2] === "fader_status") {
                pkg.emitEvent({
                  name: "faderStatus",
                  data: { path: pathParts, value: expanded.value },
                });
              }
            });
          });

          setState({ type: "connecting", ws });

          onCleanup(() => {
            ws.close();
            setState({ type: "disconnected" });
          });
        });
      }
    )
  );

  return { mixerID: () => mixerID, url, setUrl, state, setState };
});

export { mixerID, url, setUrl, state, setState };
