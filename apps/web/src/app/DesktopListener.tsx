import { Button } from "@macrograph/ui";
import { createEventListener } from "@solid-primitives/event-listener";
import { action, useAction } from "@solidjs/router";
import { Show } from "solid-js";
import { toast } from "solid-sonner";

import { getAuthState } from "~/api";

const doDesktopAuth = action(async () => {
	try {
		const id = await fetch("http://localhost:25000").catch(() => {});
		if (!id) return;

		const auth = await getAuthState();

		const toastId = toast.info(
			<>
				<b>MacroGraph Desktop</b> detected.
				<br />
				<Show when={auth} fallback={undefined /* TODO!!! */}>
					{(auth) => (
						<>
							Login as <b>{auth().user.email}</b>?
							<div class="flex flex-row gap-2 mt-2">
								<Button
									variant="secondary"
									onClick={async () => {
										await fetch("http://localhost:25000/session", {
											method: "POST",
											headers: { "Content-Type": "application/json" },
											body: JSON.stringify(auth().session.id),
										});

										toast.success(
											<>
												Login successful, head to <b>MacroGraph Desktop</b>
											</>,
										);
									}}
								>
									Login
								</Button>
								<Button
									variant="default"
									onClick={() => toast.dismiss(toastId)}
								>
									Cancel
								</Button>
							</div>
						</>
					)}
				</Show>
			</>,
		);

		return id;
	} catch (e) {
		return undefined;
	}
});

export default function DesktopListener() {
	const desktopAuth = useAction(doDesktopAuth);

	desktopAuth();

	createEventListener(window, "focus", () => {
		desktopAuth();
	});

	return null;
}
