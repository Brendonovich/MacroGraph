import clsx from "clsx";
import { JSX, ParentProps, Show, createSignal, createMemo } from "solid-js";
import { RiArrowsExpandRightLine } from "solid-icons/ri";
import { makePersisted } from "@solid-primitives/storage";

export type Side = "left" | "right";

const MIN_WIDTH = 300;
const SNAP_CLOSE_PCT = 0.65;

export function Sidebar(props: ParentProps<{ side: Side }>) {
  const [width, setWidth] = makePersisted(createSignal(MIN_WIDTH), {
    name: `sidebar-${props.side}-width`,
  });
  const [open, setOpen] = makePersisted(createSignal(true), {
    name: `sidebar-${props.side}-open`,
  });

  return (
    <div
      class="relative flex flex-col bg-neutral-600 shadow-2xl"
      style={`width: ${open() ? Math.max(MIN_WIDTH, width()) : 0}px;`}
    >
      <div
        class={clsx(
          "absolute top-1 z-10",
          props.side === "left" ? "right-[-30px]" : "left-[-30px]"
        )}
        style={`transform: rotate(${
          open() !== (props.side === "right") ? 0.5 : 0
        }turn);`}
        onClick={() => setOpen((o) => !o)}
      >
        <RiArrowsExpandRightLine size="1.5rem" />
      </div>
      <Show when={open()}>
        <div
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startWidth = width();

            e.stopPropagation();
            if (e.button !== 0) return;

            const handleMouseMove = (e: MouseEvent) => {
              setWidth(
                startWidth +
                  (e.clientX - startX) * (props.side === "left" ? 1 : -1)
              );

              if (width() < MIN_WIDTH * (1 - SNAP_CLOSE_PCT)) setOpen(false);
              else if (width() > MIN_WIDTH * (1 - SNAP_CLOSE_PCT))
                setOpen(true);
            };
            window.addEventListener("mousemove", handleMouseMove);

            const listener = () => {
              if (width() < MIN_WIDTH) setWidth(MIN_WIDTH);

              window.removeEventListener("mouseup", listener);
              window.removeEventListener("mousemove", handleMouseMove);
            };
            window.addEventListener("mouseup", listener);
          }}
          class={clsx(
            "absolute cursor-ew-resize w-1 inset-y-0 z-10",
            props.side === "left" ? "right-[-5px]" : "left-0"
          )}
        />
        {props.children}
      </Show>
    </div>
  );
}

const MIN_HEIGHT = 250;

export function SidebarSection(
  props: ParentProps<{ title: string; right?: JSX.Element }>
) {
  const [open, setOpen] = makePersisted(createSignal(!false), {
    name: `sidebar-section-${props.title}-open`,
  });
  const [height, setHeight] = makePersisted(createSignal(MIN_HEIGHT), {
    name: `sidebar-section-${props.title}-height`,
  });

  const [prevPos, setPrevPos] = createSignal(0);

  return (
    <div class="flex flex-col h-auto relative">
      <button
        onClick={() => setOpen((o) => !o)}
        class="flex flex-row justify-between items-center bg-neutral-900 text-white px-2 font-medium shadow py-1"
      >
        {props.title}
        {props.right}
      </button>
      <Show when={open()}>
        <div class="overflow-y-auto" style={`height: ${height()}px`}>
          {props.children}
        </div>
        <div
          onMouseDown={(e) => {
            setPrevPos(e.clientY);
            e.stopPropagation();
            if (e.button !== 0) return;
            const handleMouseMove = (e: MouseEvent) => {
              setHeight(Math.max(250, height() + (e.clientY - prevPos())));
              if (height() + (e.clientY - prevPos()) > 250)
                setPrevPos(e.clientY);
            };
            document.body.style.cursor = "ns-resize";
            window.addEventListener("mousemove", handleMouseMove);
            const listener = () => {
              document.body.style.cursor = "auto";
              window.removeEventListener("mouseup", listener);
              window.removeEventListener("mousemove", handleMouseMove);
            };
            window.addEventListener("mouseup", listener);
          }}
          class="h-0.5 w-full relative cursor-ns-resize bg-neutral-700 overflow-visible"
        >
          <div class="-top-0.5 -bottom-0.5 w-full absolute z-10" />
        </div>
      </Show>
    </div>
  );
}
