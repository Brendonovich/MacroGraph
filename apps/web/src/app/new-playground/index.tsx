import { clientOnly } from "@solidjs/start";

const Playground = clientOnly(() => import("@macrograph/playground"));

export default function NewPlayground() {
	return <Playground />;
}
