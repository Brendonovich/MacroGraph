import {
	Accessor,
	Match,
	ParentProps,
	Switch,
	children,
	createSignal,
	useContext,
	createContext,
	For,
	Show,
} from "solid-js";
import { t } from "@macrograph/typesystem";
import { DropdownMenu } from "@kobalte/core";
import clsx from "clsx";
import { useCore } from "../contexts";

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

export function TypeEditor(props: {
	type: t.Any;
	onChange?: (type: t.Any) => void;
}) {
	const core = useCore();
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
					<DropdownMenu.Content class="p-2 bg-black border border-black w-64 max-h-52 flex flex-col overflow-y-auto text-white">
						<span>Primitives</span>
						<div class="flex flex-col pl-1 text-sm">
							{PRIMITIVES.map((p) => (
								<button
									type="button"
									class="text-left hover:bg-white/20 px-1 py-0.5 rounded"
									onClick={() => {
										ctx.typeDialogState()?.onTypeSelected(p);
										ctx.setTypeDialogState(null);
									}}
								>
									{p.toString()}
								</button>
							))}
						</div>
						<span>Containers</span>
						<div class="flex flex-col pl-1 text-sm">
							{CONTAINERS.map(([name, apply]) => (
								<button
									class="text-left hover:bg-white/20 px-1 py-0.5 rounded"
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
								</button>
							))}
						</div>
						<span>Structs</span>
						<div class="flex flex-col pl-1 text-sm">
							<For each={core.packages}>
								{(pkg) => (
									<Show when={pkg.structs.size > 0}>
										<span class="text-neutral-300 text-xs py-1">
											{pkg.name}
										</span>
										<For each={[...pkg.structs.values()]}>
											{(struct) => (
												<button
													class="text-left hover:bg-white/20 px-1 py-0.5 rounded"
													onClick={() => {
														ctx
															.typeDialogState()
															?.onTypeSelected(t.struct(struct));
														ctx.setTypeDialogState(null);
													}}
												>
													{struct.name}
												</button>
											)}
										</For>
									</Show>
								)}
							</For>
						</div>
						<span>Enums</span>
						<div class="flex flex-col pl-1 text-sm">
							<For each={core.packages}>
								{(pkg) => (
									<Show when={pkg.enums.size > 0}>
										<span class="text-neutral-300 text-xs py-1">
											{pkg.name}
										</span>
										<For each={[...pkg.enums.values()]}>
											{(enm) => (
												<button
													class="text-left hover:bg-white/20 px-1 py-0.5 rounded"
													onClick={() => {
														ctx.typeDialogState()?.onTypeSelected(t.enum(enm));
														ctx.setTypeDialogState(null);
													}}
												>
													{enm.name}
												</button>
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
					? "border-yellow-500 bg-yellow-500/20"
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
		>
			{props.children}
		</div>
	);
}

function PaddedSpan(props: ParentProps) {
	return <span class="p-1">{props.children}</span>;
}
