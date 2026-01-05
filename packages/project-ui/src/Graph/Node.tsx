import { Match } from "effect";
import type { Mutable } from "effect/Types";
import {
	GraphPosition,
	IO,
	type Node,
	type Schema,
} from "@macrograph/project-domain";
import { createElementBounds } from "@solid-primitives/bounds";
import { createEventListener } from "@solid-primitives/event-listener";
import { cx } from "cva";
import {
	type Accessor,
	type ComponentProps,
	createEffect,
	createRoot,
	createSignal,
	For,
	type JSX,
	onCleanup,
	type ParentProps,
	Show,
} from "solid-js";
import type { DOMElement } from "solid-js/jsx-runtime";

import { isTouchDevice } from "../platform";
import { useGraphContext } from "./Context";

export function NodeRoot(
	props: ParentProps<{
		id: Node.Id;
		position: { x: number; y: number };
		selected?: boolean | string;
		graphBounds: { left: number; top: number };
		onPinDragStart?(event: PointerEvent, type: "i" | "o", id: IO.Id): boolean;
		onPinDragEnd?(
			type: "i" | "o",
			id: string,
			position: { x: number; y: number },
		): void;
		onPinPointerUp?(event: PointerEvent, type: "i" | "o", id: IO.Id): void;
		onPinDoubleClick?(type: "i" | "o", id: IO.Id): void;
		connections?: { in?: IO.Id[]; out?: IO.Id[] };
	}> &
		Mutable<IO.NodeIO>,
) {
	const graphCtx = useGraphContext();
	const [nodeRef, setNodeRef] = createSignal<HTMLDivElement>();
	const nodeElementBounds = createElementBounds(nodeRef);

	const nodeBounds = () => {
		return {
			left:
				props.position.x +
				props.graphBounds.left -
				(graphCtx.translate?.x ?? 0),
			top:
				props.position.y + props.graphBounds.top - (graphCtx.translate?.y ?? 0),
		};
	};

	// Track node dimensions in canvas coordinates
	createEffect(() => {
		const bounds = nodeElementBounds;
		const scale = graphCtx.scale;

		if (bounds.width && bounds.height) {
			graphCtx.nodeBounds.set(props.id, {
				x: props.position.x,
				y: props.position.y,
				width: bounds.width / scale,
				height: bounds.height / scale,
			});
		}
	});

	onCleanup(() => {
		graphCtx.nodeBounds.delete(props.id);
	});

	function useIOPositionTrack(
		index: Accessor<number>,
		id: IO.Id,
		type: "i" | "o",
		ref: Accessor<HTMLDivElement | undefined>,
	) {
		createEffect(() => {
			index();

			const element = ref();
			if (!element) return;

			const rect = element.getBoundingClientRect();

			// Convert the pin's screen position (center of the element) to canvas coordinates
			const position = graphCtx.getGraphPosition({
				x: rect.left + rect.width / 2,
				y: rect.top + rect.height / 2,
			});

			graphCtx.ioPositions.set(`${props.id}:${type}:${id}`, position);
		});

		onCleanup(() => {
			graphCtx.ioPositions.delete(`${props.id}:${type}:${id}`);
		});
	}

	function onPinPointerDown(
		event: PointerEvent & { target: DOMElement },
		id: IO.Id,
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
			ref={setNodeRef}
			class={cx(
				"absolute rounded-lg overflow-hidden text-xs whitespace-nowrap",
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

							const connected = () =>
								(draggingPointers()?.length ?? 0) > 0 ||
								props.connections?.in?.includes(input.id);

							const pointerHandlers: Pick<
								JSX.CustomEventHandlersCamelCase<any>,
								"onPointerDown" | "onPointerUp" | "onDblClick"
							> = {
								onPointerDown: (e) => {
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
								},
								onPointerUp: (e) => props.onPinPointerUp?.(e, "i", input.id),
								onDblClick: () => props.onPinDoubleClick?.("i", input.id),
							};

							return (
								<div class="flex flex-row items-center space-x-1.5 h-4.5">
									<IOPin
										connected={connected()}
										ref={setRef}
										variant={input.variant}
										pointerHandlers={pointerHandlers}
									/>
									<span>{input.name}</span>
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

							const connected = () =>
								(draggingPointers()?.length ?? 0) > 0 ||
								props.connections?.out?.includes(output.id);

							const pointerHandlers: Pick<
								JSX.CustomEventHandlersCamelCase<any>,
								"onPointerDown" | "onPointerUp" | "onDblClick"
							> = {
								onPointerDown: (e) => {
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
								},
								onPointerUp: (e) => props.onPinPointerUp?.(e, "o", output.id),
								onDblClick: () => props.onPinDoubleClick?.("o", output.id),
							};

							return (
								<div class="flex flex-row items-center space-x-1.5 h-4.5">
									<Show when={output.name}>
										<span>{output.name}</span>
									</Show>
									<IOPin
										connected={connected()}
										ref={setRef}
										variant={output.variant}
										pointerHandlers={pointerHandlers}
									/>
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
	props: { variant: Schema.Type; name: string } & ComponentProps<"div">,
) {
	return (
		<div
			class={cx(
				"h-5.5 font-medium",
				matchSchemaTypeBackgroundColour(props.variant),
			)}
		>
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

export const matchSchemaTypeBackgroundColour = Match.type<Schema.Type>().pipe(
	Match.when("base", () => "bg-neutral-600"),
	Match.when("event", () => "bg-red-700"),
	Match.when("exec", () => "bg-blue-600"),
	Match.when("pure", () => "bg-emerald-700"),
	Match.exhaustive,
);

export const matchSchemaTypeTextColour = Match.type<Schema.Type>().pipe(
	Match.when("base", () => "text-neutral-600"),
	Match.when("event", () => "text-red-700"),
	Match.when("exec", () => "text-blue-600"),
	Match.when("pure", () => "text-emerald-700"),
	Match.exhaustive,
);

const matchTypeColor = Match.type<IO.T.Primitive_["_tag"]>().pipe(
	Match.when("Bool", () => "text-red-600"),
	Match.when("Float", () => "text-green-600"),
	Match.when("Int", () => "text-teal-300"),
	Match.when("String", () => "text-pink-500"),
	Match.when("DateTime", () => "text-blue-500"),
	Match.exhaustive,
);

type IOPinPointerHanlders = Pick<
	JSX.CustomEventHandlersCamelCase<any>,
	"onPointerDown" | "onPointerUp" | "onDblClick"
>;

const IOPin = (
	props: {
		connected?: boolean;
		variant: IO.Exec | IO.Data;
		pointerHandlers: IOPinPointerHanlders;
	} & Pick<ComponentProps<"div">, "ref"> &
		IOPinPointerHanlders,
) => {
	return (
		<div
			ref={props.ref}
			class={cx(
				"size-3.5",
				// output.variant === "data" && matchTypeColor(output.data),
			)}
		>
			<Show when={props.variant._tag === "Exec"}>
				<ExecPin connected={props.connected} {...props.pointerHandlers} />
			</Show>
			<Show when={props.variant._tag === "Data" && props.variant}>
				{(variant) => (
					<DataPin
						connected={props.connected}
						type={IO.T.deserialize(variant().type)}
						{...props.pointerHandlers}
					/>
				)}
			</Show>
		</div>
	);
};

const DataPin = (
	props: { connected?: boolean; type: IO.T.Any_ } & Pick<
		ComponentProps<"div">,
		"onPointerDown" | "onPointerUp" | "onDblClick"
	>,
) => {
	return (
		<div
			class={cx(
				"relative size-full border-[2.5px] rounded-full border-current @hover-bg-current",
				props.connected && "bg-current",
				matchTypeColor(IO.T.primaryTypeOf_(props.type)._tag),
			)}
		>
			<div
				class={cx("absolute", isTouchDevice ? "-inset-2" : "inset-0")}
				{...props}
			/>
		</div>
	);
};

const ExecPin = (
	props: { connected?: boolean } & Pick<
		ComponentProps<"svg">,
		"onPointerDown" | "onPointerUp" | "onDblClick"
	>,
) => {
	return (
		<svg
			aria-hidden="true"
			style={{ "pointer-events": "all" }}
			viewBox="0 0 14 17.5"
			class={cx(
				"w-full text-white @hover-fill-current pointer-events-[all]",
				props.connected && "fill-current",
			)}
			xmlns="http://www.w3.org/2000/svg"
			{...props}
		>
			<path
				d="M12.6667 8.53812C13.2689 9.03796 13.2689 9.96204 12.6667 10.4619L5.7983 16.1622C4.98369 16.8383 3.75 16.259 3.75 15.2003L3.75 3.79967C3.75 2.74104 4.98369 2.16171 5.79831 2.83779L12.6667 8.53812Z"
				stroke="white"
				stroke-width="1.5"
			/>
		</svg>
	);
};
