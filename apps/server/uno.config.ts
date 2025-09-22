import {
	defineConfig,
	presetWind3,
	transformerDirectives,
	transformerVariantGroup,
} from "unocss";
import { presetAnimations } from "unocss-preset-animations";
import { presetKobalte } from "unocss-preset-primitives";
import { presetScrollbar } from "unocss-preset-scrollbar";

function getColorScale(name: string, alpha = false) {
	const scale = {};
	for (let i = 1; i <= 12; i++) {
		scale[i] = `var(--${name}-${i})`;
		// next line only needed if using alpha values
		if (alpha) scale[`a${i}`] = `var(--${name}-a${i})`;
	}

	return scale;
}

export default defineConfig({
	presets: [
		presetWind3(),
		presetAnimations(),
		presetKobalte() as any,
		presetScrollbar,
	],
	transformers: [transformerVariantGroup(), transformerDirectives()],
	theme: {
		colors: {
			gray: getColorScale("gray"),
			red: getColorScale("red"),
		},
	},
});
