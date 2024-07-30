import { DropdownMenu } from "@kobalte/core";
import { t } from "@macrograph/typesystem";
import clsx from "clsx";
import {
	type Accessor,
	For,
	Match,
	type ParentProps,
	Show,
	Switch,
	children,
	createContext,
	createSignal,
	useContext,
} from "solid-js";

import { useInterfaceContext } from "../context";
import { tw } from "../util";

type TypeDialogState = {
	currentType: t.Any;
	innerType: t.Any;
	onTypeSelected: (type: t.Any) => void;
};

function createContextValue() {
	const [typeDialogState, setTypeDialogState] =
		createSignal<null | TypeDialogState>(null);

	const [hoveredType, setHoveredType] = createSignal<t.Any | null>(null);

	return {
		typeDialogState,
		setTypeDialogState,
		hoveredType,
		setHoveredType,
		openTypeDialog(state: TypeDialogState) {
			setTypeDialogState(state);
		},
	};
}

const TypeEditorContext = createContext<ReturnType<typeof createContextValue>>(
	null!,
);

const CategoryLabel = tw.span`font-medium text-xs text-neutral-300 mb-0.5`;
const TypeItem = tw.button`text-left hover:bg-white/10 px-1 py-0.5 rounded`;

export function TypeEditor(props: {
	type: t.Any;
	onChange?: (type: t.Any) => void;
}) {
	const interfaceCtx = useInterfaceContext();
	const ctx = createContextValue();

	return (
		<TypeEditorContext.Provider value={ctx}>
			<DropdownMenu.Root
				open={ctx.typeDialogState() !== null}
				onOpenChange={() => ctx.setTypeDialogState(null)}
			>
				<DropdownMenu.Trigger class="py-px overflow-x-auto overflow-y-hidden no-scrollbar font-mono flex flex-row text-sm bg-black rounded-lg">
					<TypeEditorSegment
						type={props.type}
						onChange={(type) => props.onChange?.(type)}
					/>
				</DropdownMenu.Trigger>
				<DropdownMenu.Portal>
					<DropdownMenu.Content class="text-sm mt-1 p-2 bg-neutral-900 rounded w-48 max-h-52 flex flex-col overflow-y-auto text-white ui-expanded:animate-in ui-expanded:fade-in ui-expanded:slide-in-from-top-1 ui-closed:animate-out ui-closed:fade-out ui-closed:slide-out-to-top-1 duration-100 shadow">
						<CategoryLabel>Primitives</CategoryLabel>
						<div class="flex flex-col mb-1">
							{PRIMITIVES.map((p) => (
								<TypeItem
									type="button"
									onClick={() => {
										ctx.typeDialogState()?.onTypeSelected(p);
										ctx.setTypeDialogState(null);
									}}
								>
									{p.toString()}
								</TypeItem>
							))}
						</div>
						<CategoryLabel>Containers</CategoryLabel>
						<div class="flex flex-col mb-1">
							{CONTAINERS.map(([name, apply]) => (
								<TypeItem
									type="button"
									onClick={() => {
										ctx
											.typeDialogState()
											?.onTypeSelected(
												apply(ctx.typeDialogState()?.innerType!),
											);
										ctx.setTypeDialogState(null);
									}}
								>
									{name.toString()}
								</TypeItem>
							))}
						</div>
						<CategoryLabel>Structs</CategoryLabel>
						<div class="flex flex-col pl-2 mb-1">
							<Show when={interfaceCtx.core.project.customStructs.size > 0}>
								<span class="text-neutral-300 text-xs mt-0.5">Custom</span>
								<For
									each={[...interfaceCtx.core.project.customStructs.values()]}
								>
									{(struct) => (
										<TypeItem
											type="button"
											onClick={() => {
												ctx.typeDialogState()?.onTypeSelected(t.struct(struct));
												ctx.setTypeDialogState(null);
											}}
										>
											{struct.name}
										</TypeItem>
									)}
								</For>
							</Show>
							<For each={interfaceCtx.core.packages}>
								{(pkg) => (
									<Show when={pkg.structs.size > 0}>
										<span class="text-neutral-300 text-xs mt-0.5">
											{pkg.name}
										</span>
										<For each={[...pkg.structs.values()]}>
											{(struct) => (
												<TypeItem
													type="button"
													onClick={() => {
														ctx
															.typeDialogState()
															?.onTypeSelected(t.struct(struct));
														ctx.setTypeDialogState(null);
													}}
												>
													{struct.name}
												</TypeItem>
											)}
										</For>
									</Show>
								)}
							</For>
						</div>
						<CategoryLabel>Enums</CategoryLabel>
						<div class="flex flex-col pl-2">
							<For each={interfaceCtx.core.packages}>
								{(pkg) => (
									<Show when={pkg.enums.size > 0}>
										<span class="text-neutral-300 text-xs mt-0.5">
											{pkg.name}
										</span>
										<For each={[...pkg.enums.values()]}>
											{(enm) => (
												<TypeItem
													type="button"
													onClick={() => {
														ctx.typeDialogState()?.onTypeSelected(t.enum(enm));
														ctx.setTypeDialogState(null);
													}}
												>
													{enm.name}
												</TypeItem>
											)}
										</For>
									</Show>
								)}
							</For>
						</div>
					</DropdownMenu.Content>
				</DropdownMenu.Portal>
			</DropdownMenu.Root>
		</TypeEditorContext.Provider>
	);
}

const PRIMITIVES = [t.string(), t.int(), t.float(), t.bool()];

const CONTAINERS = [
	["Option", t.option],
	["List", t.list],
	["Map", t.map],
] satisfies Array<[string, (current: t.Any) => t.Any]>;

function createTypeEditorSegmentContextValue(props: { type: Accessor<t.Any> }) {
	const editorCtx = useContext(TypeEditorContext)!;

	return {
		type: props.type,
		hovered: () =>
			editorCtx.typeDialogState()?.currentType === props.type() ||
			editorCtx.hoveredType() === props.type(),
	};
}

const TypeEditorSegmentContext = createContext<
	ReturnType<typeof createTypeEditorSegmentContextValue>
>(null!);

function TypeEditorSegment(props: {
	type: t.Any;
	onChange?: (type: t.Any) => void;
}) {
	const ctx = useContext(TypeEditorContext)!;

	const ctxValue = createTypeEditorSegmentContextValue({
		type: () => props.type,
	});

	const onClickFactory = (innerType: Accessor<t.Any>) => (e: MouseEvent) => {
		e.stopPropagation();

		ctx.openTypeDialog({
			currentType: props.type,
			innerType: innerType(),
			onTypeSelected: (type) => props.onChange?.(type),
		});
	};

	return (
		<TypeEditorSegmentContext.Provider value={ctxValue}>
			<Switch>
				<Match when={props.type instanceof t.Primitive && props.type}>
					{(primitiveType) => (
						<Span onClick={onClickFactory(primitiveType)}>
							<PaddedSpan>{primitiveType().toString()}</PaddedSpan>
						</Span>
					)}
				</Match>
				<Match when={props.type instanceof t.Option && props.type}>
					{(optionType) => {
						const onClick = onClickFactory(() => optionType().inner);

						return (
							<Span onClick={onClick}>
								<PaddedSpan>Option</PaddedSpan>
								<TypeEditorSegment
									type={optionType().inner}
									onChange={(type) => props.onChange?.(t.option(type))}
								/>
							</Span>
						);
					}}
				</Match>
				<Match when={props.type instanceof t.List && props.type}>
					{(listType) => {
						const onClick = onClickFactory(() => listType().item);

						return (
							<Span onClick={onClick}>
								<PaddedSpan>List</PaddedSpan>
								<TypeEditorSegment
									type={listType().item}
									onChange={(type) => props.onChange?.(t.list(type))}
								/>
							</Span>
						);
					}}
				</Match>
				<Match when={props.type instanceof t.Map && props.type}>
					{(mapType) => {
						const onClick = onClickFactory(() => mapType().value);

						return (
							<Span onClick={onClick}>
								<PaddedSpan>Map</PaddedSpan>
								<TypeEditorSegment
									type={mapType().value}
									onChange={(type) => props.onChange?.(t.map(type))}
								/>
							</Span>
						);
					}}
				</Match>
				<Match when={props.type instanceof t.Struct && props.type}>
					{(structType) => (
						<Span onClick={onClickFactory(structType)}>
							<PaddedSpan>{structType().toString()}</PaddedSpan>
						</Span>
					)}
				</Match>
				<Match when={props.type instanceof t.Enum && props.type}>
					{(enumType) => (
						<Span onClick={onClickFactory(enumType)}>
							<PaddedSpan>{enumType().toString()}</PaddedSpan>
						</Span>
					)}
				</Match>
			</Switch>
		</TypeEditorSegmentContext.Provider>
	);
}

function Span(
	props: ParentProps<{
		onClick?: (e: MouseEvent) => void;
	}>,
) {
	const editorCtx = useContext(TypeEditorContext)!;
	const ctx = useContext(TypeEditorSegmentContext)!;

	const resolved = children(() => props.children);

	return (
		<div
			class={clsx(
				"cursor-pointer border rounded-lg px-1 flex flex-row flex-nowrap shrink-0 -my-px",
				ctx.hovered()
					? "border-mg-focus bg-mg-focus/20"
					: "border-neutral-700 bg-black",
				resolved.toArray().length > 1 && "pr-2",
			)}
			onMouseMove={(e) => {
				e.stopPropagation();

				editorCtx.setHoveredType(ctx.type);
			}}
			onMouseLeave={(e) => {
				e.stopPropagation();

				editorCtx.setHoveredType(null);
			}}
			onClick={(e) => props.onClick?.(e)}
			onKeyPress={(e) => {
				if (e.key === "Enter") e.currentTarget.click();
			}}
		>
			{props.children}
		</div>
	);
}

function PaddedSpan(props: ParentProps) {
	return <span class="p-1">{props.children}</span>;
}
