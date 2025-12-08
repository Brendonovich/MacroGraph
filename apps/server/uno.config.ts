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
				focus: "#eab308",
			},
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
		animation: {
			keyframes: {
				"accordion-down":
					"{from { height: 0; } to { height: var(--kb-accordion-content-height); }}",
				"accordion-up":
					"{from { height: var(--kb-accordion-content-height); } to { height: 0; }}",
				"content-show":
					"{from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); }}",
				"content-hide":
					"{from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.96); }}",
			},
			durations: {
				"accordion-down": "0.2s",
				"accordion-up": "0.2s",
				"content-show": "0.2s",
				"content-hide": "0.2s",
			},
			timingFns: {
				"accordion-down": "ease-out",
				"accordion-up": "ease-out",
				"content-show": "ease-out",
				"content-hide": "ease-out",
			},
		},
	},
});
