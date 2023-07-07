import { InferEnum, Maybe, Option, core, t } from "@macrograph/core";
import { List } from "@macrograph/core/src/types/t";
import pkg from "./pkg";
import {
  createEffect,
  createSignal,
  createRoot,
  on,
  onCleanup,
} from "solid-js";

const { goxlr, mixerID, url, setUrl, state, setState } = createRoot(() => {
  const [state, setState] = createSignal<
    | {
        type: "disconnected";
      }
    | { type: "connecting" }
    | {
        type: "connected";
      }
  >({ type: "disconnected" });

  const [url, setUrl] = createSignal<Option<string>>(
    Maybe(localStorage.getItem("GoXLR_WS"))
  );

  let mixerID: string | undefined;

  let goxlr: WebSocket;

  createEffect(
    on(
      () => url(),
      (url) =>
        url
          .map((url) => (localStorage.setItem("GoXLR_WS", url), true))
          .unwrapOrElse(() => (localStorage.removeItem("GoXLR_WS"), false))
    )
  );

  createEffect(
    on(
      () => url(),
      (url) => {
        url.map((url) => {
          goxlr = new WebSocket(url);

          goxlr.addEventListener("open", () => {
            setState({ type: "connected" });
            goxlr.send(
              JSON.stringify({
                id: 0,
                data: "GetStatus",
              })
            );
          });

          goxlr.addEventListener("message", (data: any) => {
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

          setState({ type: "connecting" });

          onCleanup(() => {
            goxlr.close();
            setState({ type: "disconnected" });
          });
        });
      }
    )
  );

  return { goxlr, mixerID, url, setUrl, state, setState };
});

export { goxlr, mixerID, url, setUrl, state, setState };
