import { ParentProps } from "solid-js";
import { clientOnly } from "@solidjs/start";

import { HeaderAuthFallback } from "../HeaderAuthSection";
import { Logo } from "../Logo";
import { A } from "@solidjs/router";

const AuthSection = clientOnly(() =>
	import("../HeaderAuthSection").then((i) => ({
		default: i.HeaderAuthSection,
	})),
);

export default function (props: ParentProps) {
	return (
		<div class="flex flex-col items-center">
			<header class="h-12 flex flex-row justify-between p-2 w-full items-center">
				<Logo />

				<nav class="flex flex-row gap-2">
					<A href="credentials" activeClass="underline">
						Credentials
					</A>
					<A href="servers" activeClass="underline">
						Servers
					</A>
				</nav>

				<AuthSection fallback={<HeaderAuthFallback />} />
			</header>
			{props.children}
		</div>
	);
}
