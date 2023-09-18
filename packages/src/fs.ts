import { createPackage, t } from "@macrograph/core";
import { rspcClient } from "./rspcClient";

export const pkg = createPackage<any>({ name: "FS" });

pkg.createNonEventSchema({
  name: "List Files",
  variant: "Exec",
  generateIO(io) {
    return {
      path: io.dataInput({
        id: "path",
        name: "Folder Path",
        type: t.string(),
      }),
      files: io.dataOutput({
        id: "files",
        name: "Files",
        type: t.list(t.string()),
      }),
    };
  },
  async run({ ctx, io }) {
    const path = ctx.getInput(io.path);
    const files = await rspcClient.query(["fs.list", path]);

    const array = files
      .map((f) => {
        if ("File" in f) return f.File;
      })
      .filter(Boolean) as string[];

    ctx.setOutput(io.files, array);
  },
});
