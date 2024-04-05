interface DownloadOptionConfig {
  tauriTarget: TauriTarget;
}

type TauriTarget =
  | "windows-x86_64"
  | "darwin-aarch64"
  | "darwin-x86_64"
  | "linux-x86_64";

const DownloadOptions = {
  "windows-x86_64": { tauriTarget: "windows-x86_64" },
  "darwin-aarch64": { tauriTarget: "darwin-aarch64" },
  "darwin-x86_64": { tauriTarget: "darwin-x86_64" },
  "linux-x86_64-AppImage": { tauriTarget: "linux-x86_64" },
  "linux-x86_64-deb": { tauriTarget: "linux-x86_64" },
} satisfies Record<string, DownloadOptionConfig>;

export type DownloadTarget = keyof typeof DownloadOptions;

const AssetNames = {
  "windows-x86_64": (v) => `MacroGraph_${v}_x64_en-US.msi`,
  "darwin-aarch64": (v) => `MacroGraph_${v}_aarch64.dmg`,
  "darwin-x86_64": (v) => `MacroGraph_${v}_x64.dmg`,
  "linux-x86_64-AppImage": (v) => `macro-graph_${v}_amd64.AppImage`,
  "linux-x86_64-deb": (v) => `macro-graph_${v}_amd64.deb`,
} satisfies Record<DownloadTarget, (version: string) => string>;

export async function getDownloadURL(target: DownloadTarget) {
  "use server";

  const res = await fetch(
    `https://cdn.crabnebula.app/update/macrograph/macrograph/${DownloadOptions[target].tauriTarget}/latest`
  );

  const { version } = (await res.json()) as { version: string };

  return `https://cdn.crabnebula.app/download/macrograph/macrograph/latest/${AssetNames[
    target
  ](version)}`;
}
