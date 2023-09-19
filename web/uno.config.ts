import { defineConfig, presetUno } from "unocss";
import { presetKobalte } from "unocss-preset-primitives";
import { presetForms } from "@julr/unocss-preset-forms";

export default defineConfig({
  theme: {
    colors: {
      mg: {
        bool: "#DC2626",
        event: "#C20000",
        string: "#DA5697",
        exec: "#2163EB",
        int: "#30F3DB",
        pure: "#008E62",
        float: "#00AE75",
        graph: "#262626",
        base: "#696969",
        enum: "#1B4DFF",
        struct: "#FACC15",
        current: "var(--mg-current)",
      },
    },
  },
  presets: [presetUno(), presetKobalte(), presetForms()],
});
