import { createContext, useContext, type ParentProps } from "solid-js";
import { createStore } from "solid-js/store";

export type SidebarEditActions = {
	onDragStart(e: PointerEvent, index: number): void;
	toggleVisibility(id: string): void;
	sectionIndex(id: string): number;
	isVisible(id: string): boolean;
	isDragged(index: number): boolean;
};

const Ctx = createContext<SidebarEditActions>();

export function useSidebarEdit() {
	return useContext(Ctx);
}

export function SidebarEditProvider(
	props: ParentProps<{ value: SidebarEditActions }>,
) {
	return <Ctx.Provider value={props.value}>{props.children}</Ctx.Provider>;
}

export type DragState = {
	active: boolean;
	index: number | null;
	ghostY: number;
	ghostId: string | null;
};

export function createDragState(): [
	() => DragState,
	{
		start(index: number, id: string, ghostY: number): void;
		setGhostY(y: number): void;
		setIndex(index: number): void;
		end(): void;
	},
] {
	const [state, setState] = createStore<DragState>({
		active: false,
		index: null,
		ghostY: 0,
		ghostId: null,
	});
	return [
		() => state,
		{
			start(index, id, ghostY) {
				setState({ active: true, index, ghostId: id, ghostY });
			},
			setGhostY(y) {
				setState("ghostY", y);
			},
			setIndex(index) {
				setState("index", index);
			},
			end() {
				setState({ active: false, index: null, ghostId: null, ghostY: 0 });
			},
		},
	];
}
