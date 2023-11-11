import clsx from "clsx";
import { JSX, ParentProps, Show, createSignal } from "solid-js";

export enum Side {
  left = "left",
  right = "right",
}

type sidebarProps = {
  side: Side;
  children: JSX.Element;
};

export function Sidebar(props: sidebarProps) {
  const [width, setWidth] = createSignal(
    localStorage.getItem(`sidebar-${props.side}-width`) ?? 250
  );
  console.log(props);
  return (
    <div
      class={clsx(
        "flex flex-col bg-neutral-600 shadow-2xl min-w-[250px] max-w-[45%]",
        props.side === Side.right ? "fixed right-0 h-full" : "relative"
      )}
      style={`width: ${width()}px`}
    >
      <div
        onMouseDown={(e) => {
          e.stopPropagation();
          if (e.button !== 0) return;
          const handleMouseMove = (e: MouseEvent) => {
            setWidth(
              props.side === Side.left
                ? e.clientX
                : window.innerWidth - e.clientX
            );
          };
          document.body.style.cursor = "w-resize";
          window.addEventListener("mousemove", handleMouseMove);
          const listener = () => {
            localStorage.setItem(
              `sidebar-${props.side}-width`,
              width().toString()
            );
            document.body.style.cursor = "auto";
            window.removeEventListener("mouseup", listener);
            window.removeEventListener("mousemove", handleMouseMove);
          };
          window.addEventListener("mouseup", listener);
        }}
        class={clsx(
          "absolute cursor-w-resize w-1 inset-y-0",
          props.side === Side.left ? "right-0" : "left-0"
        )}
      ></div>
      {props.children}
    </div>
  );
}

export function SidebarSection(props: ParentProps<{ title: JSX.Element }>) {
  const [open, setOpen] = createSignal(true);
  return (
    <div class={clsx("flex flex-col overflow-y-hidden", open() && "flex-1")}>
      <button
        onclick={() => setOpen((o) => !o)}
        class="flex flex-row justify-between items-center bg-neutral-900 text-white px-2 font-medium shadow py-1"
      >
        {props.title}
      </button>
      <Show when={open()}>{props.children}</Show>
    </div>
  );
}
