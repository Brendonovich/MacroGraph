import { Package, core, t } from "@macrograph/core";
import { rspcClient } from "@macrograph/core";

const pkg = core.createPackage<any>({ name: "FS" });

pkg.createNonEventSchema({
  name: "List Files",
  variant: "Exec",
  generateIO(io) {
    io.dataInput({
      id: "path",
      name: "Folder Path",
      type: t.string(),
    });
    io.dataOutput({
      id: "files",
      name: "Files",
      type: t.list(t.string()),
    });
  },
  async run({ ctx }) {
    const path = ctx.getInput<string>("path");
    const files = await rspcClient.query(["fs.list", path]);

    const array = files
      .map((f) => {
        if ("File" in f) return f.File;
      })
      .filter(Boolean) as string[];

    ctx.setOutput<string[]>("files", array);
  },
});
