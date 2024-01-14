import { EventsMap, Package } from "@macrograph/runtime";
import { Ctx, bridgeClient } from "./ctx";

export function postRequest(url: string, json: any) {
  const timeoutTime = 500;
  return new Promise<any>(function (resolve, reject) {
    const controller = new AbortController();
    setTimeout(function () {
      reject(new Error("AbortTimeout"));
      controller.abort();
    }, timeoutTime);
    fetch("http://" + url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(json),
    })
      .then((response) => response.json())
      .then((data) => resolve(data))
      .catch((err) => reject(err));
  });
}

const bridge = bridgeClient.extend("/clip/v2");

export function register(pkg: Package<EventsMap>, ctx: Ctx) {}
