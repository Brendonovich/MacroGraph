import { clientOnly } from "@solidjs/start";

const Playground = clientOnly(() => import("@macrograph/playground/updated"));

export default function NewPlayground() {
	return <Playground />;
}
