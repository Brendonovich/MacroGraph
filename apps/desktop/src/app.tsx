import { Interface, Platform, PlatformContext } from "@macrograph/interface";
import { readTextFile, writeTextFile } from "@tauri-apps/api/fs";
import { makePersisted } from "@solid-primitives/storage";
import { save, open, ask } from "@tauri-apps/api/dialog";
import { SerializedProject } from "@macrograph/runtime";
import { createSignal } from "solid-js";

import { core } from "./core";
import "./app.css";

const [projectUrl, setProjectUrl] = makePersisted(
  createSignal<string | null>(null),
  { name: "currentProjectUrl" }
);

const platform: Platform = {
  projectPersistence: {
    async saveProject(saveAs = false) {
      let url = !saveAs ? projectUrl() : null;

      if (url === null) {
        url = await save({
          defaultPath: "macrograph-project.json",
          filters: [{ name: "JSON", extensions: ["json"] }],
        });
      }

      if (url === null) return;

      await writeTextFile(
        url,
        JSON.stringify(core.project.serialize(), null, 4)
      );

      setProjectUrl(url);
    },
    async loadProject() {
      if (await ask("Woudl you like to save this project?"))
        await this.saveProject();

      const url = await open({
        filters: [{ name: "JSON", extensions: ["json"] }],
        multiple: false,
      });

      if (typeof url !== "string") return;

      const data = await readTextFile(url);

      const serializedProject = SerializedProject.parse(JSON.parse(data));

      await core.load(serializedProject);

      setProjectUrl(url);
    },
    get url() {
      return projectUrl();
    },
  },
};

export default function Editor() {
  return (
    <PlatformContext.Provider value={platform}>
      <Interface core={core} environment="custom" />
    </PlatformContext.Provider>
  );
}
