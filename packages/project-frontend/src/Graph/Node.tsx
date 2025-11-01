import type { Node } from "@macrograph/project-domain";
import { createEventListener } from "@solid-primitives/event-listener";
import { cx } from "cva";
import { Match } from "effect";
import {
	type Accessor,
	type ComponentProps,
	For,
	type ParentProps,
	createEffect,
	createRoot,
	createSignal,
	onCleanup,
} from "solid-js";
import type { DOMElement } from "solid-js/jsx-runtime";

import { ioPositions } from "./GraphView";
import { isTouchDevice } from "./utils";

type DataType = "string" | "int" | "float" | "bool";
type NodeVariant = "event" | "base" | "exec" | "pure";

export function NodeRoot(
	props: ParentProps<
		{
			id: Node.Id;
			position: { x: number; y: number };
			selected?: boolean | string;
			graphBounds: { left: number; top: number };
			onPinDragStart?(
				event: PointerEvent,
				type: "i" | "o",
				id: string,
			): boolean;
			onPinDragEnd?(
				type: "i" | "o",
				id: string,
				position: { x: number; y: number },
			): void;
			onPinPointerUp?(event: PointerEvent, type: "i" | "o", id: string): void;
			onPinDoubleClick?(type: "i" | "o", id: string): void;
			connections?: {
				in?: string[];
				out?: string[];
			};
		} & Node.IO
	>,
) {
	const nodeBounds = () => {
		return {
			left: props.position.x + props.graphBounds.left,
			top: props.position.y + props.graphBounds.top,
		};
	};

	function useIOPositionTrack(
		index: Accessor<number>,
		id: string,
		type: "i" | "o",
		ref: Accessor<HTMLDivElement | undefined>,
	) {
		createEffect(() => {
			index();

			const element = ref();
			if (!element) return;

			const rect = element.getBoundingClientRect();

			const position = {
				x: props.position.x + (rect.left - nodeBounds().left) + rect.width / 2,
				y: props.position.y + (rect.top - nodeBounds().top) + rect.height / 2,
			};

			ioPositions.set(`${props.id}:${type}:${id}`, position);
		});

		onCleanup(() => {
			ioPositions.delete(`${props.id}:${type}:${id}`);
		});
	}

	function onPinPointerDown(
		event: PointerEvent & { target: DOMElement },
		id: string,
		type: "i" | "o",
		onPointerUp: () => void,
	) {
		const res = props.onPinDragStart?.(event, type, id);
		if (!res) return false;

		// necessary to avoid touch events going to the orignating element instead of the window on mobile
		if (event.target.hasPointerCapture(event.pointerId))
			event.target.releasePointerCapture(event.pointerId);

		createRoot((dispose) => {
			createEventListener(window, "pointerup", (upEvent) => {
				props.onPinDragEnd?.(type, id, {
					x: upEvent.clientX - props.graphBounds.left,
					y: upEvent.clientY - props.graphBounds.top,
				});
				onPointerUp();
				dispose();
			});
		});

		return true;
	}

	return (
		<div
			class={cx(
				"absolute rounded-lg overflow-hidden text-xs",
				"bg-black/75 border-black/75 border-2",
				props.selected && "ring-2 opacity-100",
				props.selected === true && "ring-yellow-500",
				props.selected,
			)}
			style={{
				transform: `translate(${props.position.x}px, ${props.position.y}px)`,
				"--un-ring-color":
					typeof props.selected === "string" ? props.selected : undefined,
			}}
			onPointerDown={(e) => {
				e.stopPropagation();
			}}
		>
			{props.children}
			<div class="flex flex-row gap-2 text-xs text-sm">
				<div class="px-1.5 py-2 flex flex-col gap-2.5 items-start">
					<For each={props.inputs}>
						{(input, i) => {
							const [ref, setRef] = createSignal<HTMLDivElement>();

							useIOPositionTrack(i, input.id, "i", ref);

							const [draggingPointers, setDraggingPointers] =
								createSignal<number[]>();

							return (
								<div class="flex flex-row items-center space-x-1.5 h-4.5">
									<div
										ref={setRef}
										class={cx(
											"relative size-3.5 border-[2.5px] rounded-full border-current @hover-bg-current",
											input.variant === "data" && matchTypeColor(input.data),
											((draggingPointers()?.length ?? 0) > 0 ||
												props.connections?.in?.includes(input.id)) &&
												"bg-current",
										)}
									>
										<div
											class={cx(
												"absolute",
												isTouchDevice ? "-inset-2" : "inset-0",
											)}
											onPointerDown={(e) => {
												if (
													onPinPointerDown(e, input.id, "i", () =>
														setDraggingPointers((s) =>
															s?.filter((p) => p !== e.pointerId),
														),
													)
												) {
													setDraggingPointers((s) =>
														s ? [...s, e.pointerId] : [e.pointerId],
													);
												}
											}}
											onPointerUp={(e) =>
												props.onPinPointerUp?.(e, "i", input.id)
											}
											onDblClick={() => props.onPinDoubleClick?.("i", input.id)}
										/>
									</div>
									<span>{input.name ?? input.id}</span>
								</div>
							);
						}}
					</For>
				</div>
				<div class="flex-1" />
				<div class="px-1.5 py-2 flex flex-col gap-2.5 items-end">
					<For each={props.outputs}>
						{(output, i) => {
							const [ref, setRef] = createSignal<HTMLDivElement>();

							useIOPositionTrack(i, output.id, "o", ref);

							const [draggingPointers, setDraggingPointers] =
								createSignal<number[]>();

							return (
								<div class="flex flex-row items-center space-x-1.5 h-4.5">
									<span>{output.name ?? output.id}</span>
									<div
										ref={setRef}
										class={cx(
											"relative size-3.5 border-[2.5px] rounded-full border-current @hover-bg-current",
											output.variant === "data" && matchTypeColor(output.data),
											((draggingPointers()?.length ?? 0) > 0 ||
												props.connections?.out?.includes(output.id)) &&
												"bg-current",
										)}
									>
										<div
											class={cx(
												"absolute",
												isTouchDevice ? "-inset-2" : "inset-0",
											)}
											onPointerDown={(e) => {
												if (
													onPinPointerDown(e, output.id, "o", () =>
														setDraggingPointers((s) =>
															s?.filter((p) => p !== e.pointerId),
														),
													)
												) {
													setDraggingPointers((s) =>
														s ? [...s, e.pointerId] : [e.pointerId],
													);
												}
											}}
											onPointerUp={(e) =>
												props.onPinPointerUp?.(e, "o", output.id)
											}
											onDblClick={() =>
												props.onPinDoubleClick?.("o", output.id)
											}
										/>
									</div>
								</div>
							);
						}}
					</For>
				</div>
			</div>
		</div>
	);
}

export function NodeHeader(
	props: { variant: NodeVariant; name: string } & ComponentProps<"div">,
) {
	return (
		<div class={cx("h-5.5 font-medium", matchNodeVariantColor(props.variant))}>
			<div
				{...props}
				class={cx(
					"px-1.75 h-full text-left bg-transparent w-full flex flex-row items-center",
					props.class,
				)}
			>
				{props.name}
			</div>
		</div>
	);
}

const matchNodeVariantColor = Match.type<NodeVariant>().pipe(
	Match.when("base", () => "bg-neutral-600"),
	Match.when("event", () => "bg-red-700"),
	Match.when("exec", () => "bg-blue-600"),
	Match.when("pure", () => "bg-emerald-700"),
	Match.exhaustive,
);

const matchTypeColor = Match.type<DataType>().pipe(
	Match.when("bool", () => "text-red-600"),
	Match.when("float", () => "text-green-600"),
	Match.when("int", () => "text-teal-300"),
	Match.when("string", () => "text-pink-500"),
	Match.exhaustive,
);
