import type { Platform } from "@macrograph/interface";
import type { Core } from "@macrograph/runtime";
import {
  deserializeProject,
  serde,
  serializeProject,
} from "@macrograph/runtime-serde";
import { ask, open, save } from "@tauri-apps/api/dialog";
import { readText, writeText } from "@tauri-apps/api/clipboard";
import { readTextFile, writeTextFile } from "@tauri-apps/api/fs";
import type { Accessor, Setter } from "solid-js";
import * as v from "valibot";

export function createPlatform(props: {
  projectUrl: Accessor<string | null>;
  setProjectUrl: Setter<string | null>;
  core: Core;
}) {
  return {
    projectPersistence: {
      async saveProject(saveAs = false) {
        let url = !saveAs ? props.projectUrl() : null;

        if (url === null) {
          url = await save({
            defaultPath: "macrograph-project.json",
            filters: [{ name: "JSON", extensions: ["json"] }],
          });
        }

        if (url === null) return;

        const name = url.split("/").pop()?.split(".")[0];
        if (name) props.core.project.name = name;

        await writeTextFile(
          url,
          JSON.stringify(serializeProject(props.core.project), null, 4),
        );

        props.setProjectUrl(url);
      },
      async loadProject() {
        if (await ask("Would you like to save this project?"))
          await this.saveProject();

        const url = await open({
          filters: [{ name: "JSON", extensions: ["json"] }],
          multiple: false,
        });

        if (typeof url !== "string") return;

        const data = await readTextFile(url);

        const serializedProject = v.parse(serde.Project, JSON.parse(data));

        await props.core.load((core) =>
          deserializeProject(core, serializedProject),
        );

        props.setProjectUrl(url);
      },
      get url() {
        return props.projectUrl();
      },
    },
    clipboard: {
      async readText() {
        return (await readText()) ?? "";
      },
      async writeText(text) {
        await writeText(text);
      },
    },
  } satisfies Platform;
}
