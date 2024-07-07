import clsx from "clsx";
import {
	Match,
	Switch,
	batch,
	createSignal,
	onMount,
	type ComponentProps,
	splitProps,
} from "solid-js";

export function InlineTextEditor(
	props: Omit<ComponentProps<"div">, "onChange"> & {
		value: string;
		onChange?(value: string): void;
	},
) {
	const [editing, setEditing] = createSignal(false);
	const [local, others] = splitProps(props, ["value", "onChange", "class"]);

	return (
		<div
			class={clsx(
				"flex flex-row gap-1 justify-between items-center",
				local.class,
			)}
			{...others}
		>
			<Switch>
				<Match when={editing()}>
					{(_) => {
						const [value, setValue] = createSignal(props.value);
						let ref: HTMLInputElement;

						let focused = false;

						onMount(() => {
							setTimeout(() => {
								ref.focus();
								ref.focus();
								focused = true;
							});
						});

						return (
							<input
								ref={ref!}
								class="flex-1 bg-neutral-900 rounded text-sm py-0.5 px-1.5 border-none focus:ring-yellow-500"
								value={value()}
								onInput={(e) => {
									setValue(e.target.value);
								}}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										e.stopPropagation();

										if (!focused) return;
										batch(() => {
											setEditing(false);
											props.onChange?.(value());
										});
									} else if (e.key === "Escape") {
										e.preventDefault();
										e.stopPropagation();

										setEditing(false);
									}
									e.stopPropagation();
								}}
								onFocusOut={() => {
									if (!focused) return;
									batch(() => {
										props.onChange?.(value());
										setEditing(false);
									});
								}}
							/>
						);
					}}
				</Match>
				<Match when={!editing()}>
					<span
						class="flex-1 hover:bg-white/10 rounded flex flex-row items-center justify-between py-0.5 px-1.5"
						onDblClick={(e) => {
							e.preventDefault();
							e.stopPropagation();

							setEditing(true);
						}}
					>
						{props.value}
						<button
							type="button"
							class="pointer-events-none opacity-0 focus:opacity-100"
							onClick={() => {
								setEditing(true);
							}}
						>
							<IconAntDesignEditOutlined class="size-4" />
						</button>
					</span>
					{props.children}
				</Match>
			</Switch>
		</div>
	);
}
