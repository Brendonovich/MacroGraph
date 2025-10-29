import { clientOnly } from "@solidjs/start";

import "virtual:uno.css";
import "@unocss/reset/tailwind-compat.css";

const Playground = clientOnly(() => import("@macrograph/playground"));

export default function NewPlayground() {
	return <Playground />;
}
