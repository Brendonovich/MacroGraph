import {
  ConnectionsDialog,
  CoreProvider,
  Interface,
  PlatformContext,
} from "@macrograph/interface";
import { contract } from "@macrograph/api-contract";
import { Core } from "@macrograph/runtime";
import { Button, As } from "@macrograph/ui";
import * as pkgs from "@macrograph/packages";
import { initClient } from "@ts-rest/core";

import { clientEnv } from "~/env/client";

const AUTH_URL = `${clientEnv.VITE_VERCEL_URL}/auth`;

export const api = initClient(contract, {
  baseUrl: `api`,
  baseHeaders: {},
});

const core = new Core({
  fetch,
  oauth: {
    authorize: async (provider) => {
      const loginWindow = window.open(
        `${AUTH_URL}/${provider}/login?${new URLSearchParams({
          state: window.btoa(
            JSON.stringify({
              env: "web",
              targetOrigin: window.origin,
            })
          ),
        })}`
      );

      if (!loginWindow) {
        return null;
      }

      return await new Promise<any>((res) =>
        window.addEventListener("message", (e) => {
          if (e.source !== loginWindow) return;

          res({ ...e.data, issued_at: Date.now() / 1000 });
        })
      );
    },
    refresh: async (provider, refreshToken) => {
      const res = await fetch(`${AUTH_URL}/${provider}/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      return {
        ...((await res.json()) as any),
        issued_at: Date.now() / 1000,
      };
    },
  },
  api,
});

[
  pkgs.github.pkg,
  pkgs.google.pkg,
  pkgs.goxlr.pkg,
  pkgs.json.pkg,
  pkgs.keyboard.pkg,
  pkgs.list.pkg,
  pkgs.localStorage.pkg,
  pkgs.logic.pkg,
  pkgs.map.pkg,
  pkgs.obs.pkg,
  pkgs.spotify.pkg,
  pkgs.twitch.pkg,
  pkgs.utils.pkg,
  pkgs.openai.pkg,
  pkgs.speakerbot.pkg,
  pkgs.variables.pkg,
  pkgs.customEvents.pkg,
  // pkgs.midi.pkg,
].map((p) => core.registerPackage(p));

export default () => {
  return (
    <PlatformContext.Provider value={{}}>
      <Interface core={core} environment="browser" />
    </PlatformContext.Provider>
  );
};

export function ConnectionsDialogButton() {
  return (
    <CoreProvider core={core} rootRef={() => null!}>
      <ConnectionsDialog />
    </CoreProvider>
  );
}

export function ProjectName() {
  return <>{core.project.name}</>;
}

export function ExportButton() {
  return (
    <Button
      size="icon"
      variant="ghost"
      title="Export Project"
      onClick={() =>
        saveTemplateAsFile("project.json", core.project.serialize())
      }
    >
      <IconPhExport class="w-6 h-6" />
    </Button>
  );
}

// https://stackoverflow.com/a/65939108/5721736
function saveTemplateAsFile(filename: string, dataObjToWrite: any) {
  const blob = new Blob([JSON.stringify(dataObjToWrite)], {
    type: "text/json",
  });
  const link = document.createElement("a");

  link.download = filename;
  link.href = window.URL.createObjectURL(blob);
  link.dataset.downloadurl = [
    "application/json",
    link.download,
    link.href,
  ].join(":");

  const evt = new MouseEvent("click", {
    view: window,
    bubbles: true,
    cancelable: true,
  });

  link.dispatchEvent(evt);
  link.remove();
}
