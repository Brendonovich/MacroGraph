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
			border: "hsl(var(--border))",
			input: "hsl(var(--input))",
			ring: "hsl(var(--ring))",
			background: "hsl(var(--background))",
			foreground: "hsl(var(--foreground))",
			primary: {
				DEFAULT: "hsl(var(--primary))",
				foreground: "hsl(var(--primary-foreground))",
			},
			secondary: {
				DEFAULT: "hsl(var(--secondary))",
				foreground: "hsl(var(--secondary-foreground))",
			},
			destructive: {
				DEFAULT: "hsl(var(--destructive))",
				foreground: "hsl(var(--destructive-foreground))",
			},
			info: {
				DEFAULT: "hsl(var(--info))",
				foreground: "hsl(var(--info-foreground))",
			},
			success: {
				DEFAULT: "hsl(var(--success))",
				foreground: "hsl(var(--success-foreground))",
			},
			warning: {
				DEFAULT: "hsl(var(--warning))",
				foreground: "hsl(var(--warning-foreground))",
			},
			error: {
				DEFAULT: "hsl(var(--error))",
				foreground: "hsl(var(--error-foreground))",
			},
			muted: {
				DEFAULT: "hsl(var(--muted))",
				foreground: "hsl(var(--muted-foreground))",
			},
			accent: {
				DEFAULT: "hsl(var(--accent))",
				foreground: "hsl(var(--accent-foreground))",
			},
			popover: {
				DEFAULT: "hsl(var(--popover))",
				foreground: "hsl(var(--popover-foreground))",
			},
			card: {
				DEFAULT: "hsl(var(--card))",
				foreground: "hsl(var(--card-foreground))",
			},
		},
	},
});
