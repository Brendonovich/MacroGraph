export type DownloadTarget =
	| "windows-x86_64"
	| "darwin-aarch64"
	| "darwin-x86_64"
	| "linux-x86_64-AppImage"
	| "linux-x86_64-deb";

const AssetNames: Record<DownloadTarget, (v: string) => string> = {
	"windows-x86_64": (v) => `MacroGraph_${v}_x64.exe`,
	"darwin-aarch64": (v) => `MacroGraph_${v}_aarch64.dmg`,
	"darwin-x86_64": (v) => `MacroGraph_${v}_x64.dmg`,
	"linux-x86_64-AppImage": (v) => `macro-graph_${v}_amd64.AppImage`,
	"linux-x86_64-deb": (v) => `macro-graph_${v}_amd64.deb`,
};

const GH_OWNER = "macrograph";
const GH_REPO = "macrograph";

export async function getLatestVersion() {
	"use server";

	const res = await fetch(
		`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/releases/latest`,
		{ next: { revalidate: 300 } },
	);

	const { tag_name } = (await res.json()) as { tag_name: string };

	return tag_name;
}

export async function getDownloadURL(target: DownloadTarget) {
	"use server";

	const version = await getLatestVersion();

	const filename = AssetNames[target](version);

	return `https://github.com/${GH_OWNER}/${GH_REPO}/releases/download/${version}/${filename}`;
}
