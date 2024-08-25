import { Tooltip } from "@kobalte/core";
import { DataInput, type DataOutput } from "@macrograph/runtime";
import {
	type AnyType,
	type BaseType,
	ListType,
	WildcardType,
	t,
} from "@macrograph/typesystem";
import clsx from "clsx";
import { Match, Switch } from "solid-js";

import { colour } from "../util";
import { usePin } from "./usePin";

interface Props {
	pin: DataInput<BaseType> | DataOutput<BaseType>;
}

export const DataPin = (props: Props) => {
	const { ref, highlight, dim } = usePin(() => props.pin);

	const connected = () =>
		props.pin instanceof DataInput
			? props.pin.connection.isSome()
			: props.pin.connections().length > 0;

	const containerProps = () =>
		({ ref: ref, style: { "pointer-events": "all" } }) as const;

	const rounding = (type: AnyType): string => {
		if (type instanceof ListType) {
			return "rounded-[0.1875rem]";
		}

		if (type instanceof WildcardType) {
			const value = type.wildcard.value();

			if (value.isSome()) return rounding(value.unwrap());
		}

		return "rounded-full";
	};

	const innerType = {
		get value() {
			if (props.pin.type instanceof WildcardType) {
				return props.pin.type.wildcard.value().unwrapOr(props.pin.type);
			}
			return props.pin.type;
		},
	};

	return (
		<Tooltip.Root>
			<Tooltip.Trigger
				data-dim={dim()}
				class="cursor-auto rounded-full focus-visible:outline-transparent outline-offset-1 outline-[0.1px] transition-opacity duration-100 data-[dim=true]:opacity-20"
			>
				<Switch>
					<Match when={innerType.value instanceof t.Option && innerType.value}>
						{(type) => {
							const v = {
								get type() {
									const value = type();

									if (value instanceof t.Wildcard) {
										return value.wildcard.value().unwrapOr(value);
									}
									return value;
								},
							};

							return (
								<Switch>
									<Match when={v.type instanceof t.Map && v.type}>
										{(type) => (
											<div
												{...containerProps()}
												class="w-3.5 h-3.5 flex flex-col justify-between"
											>
												{[0, 1].map(() => {
													return (
														<div
															class={clsx(
																"h-[0.1875rem] w-full flex flex-row space-x-0.5 justify-between",
															)}
															style={{ "--mg-current": colour(type()) }}
														>
															<div class="w-[0.1875rem] h-full bg-mg-string rounded-full" />
															<div
																class={clsx(
																	"h-full rounded-full bg-mg-current",
																	connected() || highlight()
																		? "flex-1"
																		: "w-1.5 ml-auto",
																)}
															/>
														</div>
													);
												})}
											</div>
										)}
									</Match>
									<Match when={v.type}>
										<div
											{...containerProps()}
											class={clsx(
												"w-3.5 h-3.5 flex justify-center items-center border-mg-current",
												rounding(type()),
												connected() || highlight()
													? "border-[2.5px]"
													: "border-[1.5px]",
											)}
											style={{ "--mg-current": colour(type()) }}
										>
											<div
												class={clsx(
													"border-[1.5px] border-mg-current",
													connected() || highlight()
														? "w-1 h-1 bg-mg-current"
														: "w-2 h-2",
													!(type().getInner() instanceof ListType)
														? "rounded-full"
														: "rounded-[0.0625rem]",
												)}
											/>
										</div>
									</Match>
								</Switch>
							);
						}}
					</Match>
					<Match when={innerType.value instanceof t.Map && innerType.value}>
						{(type) => {
							return (
								<div
									{...containerProps()}
									class="w-3.5 h-3.5 flex flex-col justify-between"
								>
									{[0, 1, 2].map(() => {
										return (
											<div
												class={clsx(
													"h-[0.1875rem] w-full flex flex-row space-x-0.5 justify-between",
												)}
												style={{ "--mg-current": colour(type()) }}
											>
												<div class="w-[0.1875rem] h-full bg-mg-string rounded-full" />
												<div
													class={clsx(
														"h-full rounded-full bg-mg-current",
														connected() || highlight()
															? "flex-1"
															: "w-1.5 ml-auto",
													)}
												/>
											</div>
										);
									})}
								</div>
							);
						}}
					</Match>
					<Match when={innerType.value}>
						{(type) => (
							<div
								{...containerProps()}
								class={clsx(
									"w-3.5 h-3.5 border-[2.5px]",
									rounding(type()),
									connected() || highlight()
										? "border-mg-current bg-mg-current"
										: "border-mg-current",
								)}
								style={{ "--mg-current": colour(type()) }}
							/>
						)}
					</Match>
				</Switch>
			</Tooltip.Trigger>
			<Tooltip.Portal>
				<Tooltip.Content class="bg-neutral-900 min-w-[2.5rem] text-center text-white text-xs px-1 py-0.5 rounded border border-neutral-700 origin-top ui-expanded:animate-in ui-expanded:zoom-in-95 ui-expanded:fade-in ui-closed:animate-out ui-closed:zoom-out-95 ui-expanded:fade-out">
					<Tooltip.Arrow />
					{props.pin.type.toString()}
				</Tooltip.Content>
			</Tooltip.Portal>
		</Tooltip.Root>
	);
};
