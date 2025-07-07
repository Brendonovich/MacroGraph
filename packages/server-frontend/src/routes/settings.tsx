import { For, type ParentProps } from "solid-js";
import { A } from "@solidjs/router";

export default function Settings(props: ParentProps) {
	return (
		<div class="flex flex-row divide-x divide-gray-5 flex-1">
			<nav class="w-40 text-sm p-2 shrink-0 flex flex-col">
				<ul class="space-y-1 flex-1">
					<For each={[{ name: "Account", href: "account" }]}>
						{(item) => (
							<li>
								<A
									href={item.href}
									activeClass="bg-gray-5"
									inactiveClass="bg-transparent hover:bg-gray-4"
									class="block text-left w-full px-2 py-1 outline-none focus-visible:outline-solid rounded focus-visible:(outline-(1 yellow-4 offset-0))"
								>
									{item.name}
								</A>
							</li>
						)}
					</For>
				</ul>
			</nav>
			<div class="max-w-lg w-full flex flex-col items-stretch p-4 text-sm">
				{props.children}
			</div>
		</div>
	);
}
