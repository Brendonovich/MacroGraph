import { Core, makePersisted } from "@macrograph/runtime";
import { None, Some } from "@macrograph/typesystem";
import { createResource, createSignal } from "solid-js";
import { Endpoint, createEndpoint } from "../httpEndpoint";
import { z } from "zod";

const AUTH_LOCALSTORAGE_KEY = "HueAuth";
const HUE_DEVICE_NAME = "Macrograph-Hue-Controller";

const CONNECT_ERROR_RES = z.object({
  error: z.object({
    type: z.number(),
    address: z.string(),
    description: z.string(),
  }),
});

const CONNECT_SUCCESS_RES = z.object({
  success: z.object({
    username: z.string(),
  }),
});

const CONNECT_RES = z.array(z.union([CONNECT_ERROR_RES, CONNECT_SUCCESS_RES]));

export function createCtx(core: Core) {
  const [state, setState] = createSignal<
    { type: "disconnected" } | { type: "connecting" } | { type: "connected" }
  >({ type: "disconnected" });

  const [ip, setIp] = createSignal<string>();

  const [auth, setAuth] = makePersisted<{
    username: string;
    bridgeip: string;
  }>(createSignal(None), AUTH_LOCALSTORAGE_KEY);

  if (auth().isSome()) {
    if ("bridgeip" in auth().unwrap() && "username" in auth().unwrap()) {
      setIp(auth().unwrap().bridgeip);
      setState({ type: "connected" });
    } else {
      setAuth(None);
      setState({ type: "disconnected" });
    }
  }

  let bridgeId: string | undefined;

  const connect = async () => {
    setState({ type: "connecting" });

    const client = createEndpoint({
      path: `http://${ip()}`,
      fetch: async (url, args) => {
        const run = () =>
          fetch(url, {
            ...args,
          });

        let resp = await run();
        return await resp.json();
      },
    });

    const api = client.extend("/api/");

    let attempts = 0;
    const interval = setInterval(() => {
      if (attempts >= 5) {
        clearInterval(interval);
        setState({ type: "disconnected" });
        return;
      }

      api
        .post(CONNECT_RES, {
          body: JSON.stringify({
            devicetype: HUE_DEVICE_NAME,
            generateclientkey: true,
          }),
        })
        .then((res) => {
          let resParsed = CONNECT_RES.parse(res)[0];
          if (resParsed != undefined && "success" in resParsed) {
            setAuth(
              Some({
                username: resParsed.success.username,
                bridgeip: ip()!,
              })
            );

            setState({ type: "connected" });
            clearInterval(interval);
          }
        });

      attempts++;
    }, 5000);

    bridgeClient = client;
  };

  const disconnect = async () => {
    setIp(undefined);
    setAuth(None);
    setState({ type: "disconnected" });
  };

  return {
    core,
    bridgeId: () => bridgeId,
    ip,
    setIp,
    state,
    setState,
    connect,
    disconnect,
  };
}

export let bridgeClient: Endpoint;

export type Ctx = ReturnType<typeof createCtx>;
