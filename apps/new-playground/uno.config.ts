import { defineConfig, presetWind3, transformerVariantGroup } from "unocss";
import { presetAnimations } from "unocss-preset-animations";

function getColorScale(name: string, alpha = false) {
  let scale = {};
  for (let i = 1; i <= 12; i++) {
    scale[i] = `var(--${name}-${i})`;
    // next line only needed if using alpha values
    if (alpha) scale[`a${i}`] = `var(--${name}-a${i})`;
  }

  return scale;
}

export default defineConfig({
  presets: [presetWind3(), presetAnimations()],
  transformers: [transformerVariantGroup()],
  theme: {
    colors: {
      gray: getColorScale("gray"),
      red: getColorScale("red"),
    },
  },
});
