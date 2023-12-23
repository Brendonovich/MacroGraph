import { makePersisted } from "@macrograph/core";
import { None } from "@macrograph/typesystem";
import { createEffect, createSignal, on, onCleanup } from "solid-js";

const SPEAKER_BOT_PORT = "SpeakerBotPort";

export type Ctx = ReturnType<typeof createCtx>;

export function createCtx() {
  const [state, setState] = createSignal<
    | {
        type: "disconnected";
      }
    | { type: "connecting" | "connected"; ws: WebSocket }
  >({ type: "disconnected" });

  const [url, setUrl] = makePersisted<string>(
    createSignal(None),
    SPEAKER_BOT_PORT
  );

  createEffect(
    on(
      () => url(),
      (url) => {
        url.map((url) => {
          const ws = new WebSocket(url);

          ws.addEventListener("open", () => {
            setState({ type: "connected", ws });
          });

          ws.addEventListener("message", (msg) => {
            console.log(msg);
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

  return { url, setUrl, state, setState };
}
