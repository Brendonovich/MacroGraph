import { Match, Switch } from "solid-js";
import { Ctx } from "./ctx";
import { postRequest } from "./api";
import { Button } from "@macrograph/ui";

const postJsonObj = { devicetype: "Macrograph-Hue-Controller" };
let discoveryData: undefined;

const DEV_DISCOVERY_RESP = [
  {
    id: "001788fffe7abfd7",
    internalipaddress: "192.168.1.23",
    port: 443,
  },
];

async function findRightIp(resGet: any) {
  return new Promise<string>(function (resolve, reject) {
    let timesFailed = 0;
    for (const data of resGet) {
      postRequest(data.internalipaddress + "/api/", postJsonObj)
        .then((resPost) => {
          if (!data.internalipaddress.startsWith("192"))
            throw new Error("no192Start");
          if ((resPost[0].error.type = 101)) resolve(data.internalipaddress);
        })
        .catch((err) => {
          timesFailed++;
          if (timesFailed >= resGet.length) reject("All IP's failed");
          else if (
            err != "Error: AbortTimeout" &&
            err != "Error: no192Start" &&
            err != "TypeError: Failed to fetch"
          )
            reject(err);
        });
    }
  });
}

export default (ctx: Ctx) => {
  return (
    <div class="flex flex-col space-y-2">
      <Switch>
        <Match when={ctx.state().type === "disconnected"}>
          {(_) => {
            if (ctx.ip() == undefined) {
              if (discoveryData == undefined) {
                console.log("calling Hue discovery");
                ctx.core
                  .fetch("https://discovery.meethue.com/", {
                    method: "GET",
                  })
                  .then((res) => res.json())
                  .then((resGet: any) => {
                    if (
                      resGet[0] &&
                      resGet[0].id &&
                      resGet[0].internalipaddress
                    ) {
                      discoveryData = resGet;
                      findRightIp(resGet)
                        .then((newIp) => {
                          ctx.setIp(newIp);
                          console.log("setting ip " + newIp);
                        })
                        .catch((err) => {
                          console.log("Bad Hue Bridge discovery response");
                        });
                    }
                  });
              } else {
                findRightIp(discoveryData)
                  .then((newIp) => {
                    ctx.setIp(newIp);
                    console.log("setting ip " + newIp);
                  })
                  .catch((err) => {
                    console.log("Bad Hue Bridge discovery response");
                  });
              }
            }

            // let resGet = DEV_DISCOVERY_RESP;

            // if (resGet[0] && resGet[0].id && resGet[0].internalipaddress)
            //   findRightIp(resGet)
            //     .then((newIp) => {
            //       ctx.setIp(newIp);
            //       console.log("setting ip " + newIp);
            //     })
            //     .catch((err) => {
            //       console.log("Bad Hue Bridge discovery response");
            //     });

            return (
              <div>
                <Switch>
                  <Match when={ctx.ip() == undefined}>
                    <div>No bridges found on the local network</div>
                  </Match>
                  <Match when={ctx.ip() != undefined}>
                    <div>Bridge found: {ctx.ip()}</div>
                    <Button onClick={ctx.connect}>Connect</Button>
                  </Match>
                </Switch>
              </div>
            );
          }}
        </Match>
        <Match when={ctx.state().type === "connecting"}>
          {(_) => {
            return <div>Press the link button on your Hue Bridge</div>;
          }}
        </Match>
        <Match when={ctx.state().type === "connected"}>
          Connected to Bridge at {ctx.ip()}
          <Button onClick={ctx.disconnect}>Disconnect</Button>
        </Match>
      </Switch>
    </div>
  );
};
