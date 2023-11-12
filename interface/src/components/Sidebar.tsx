import clsx from "clsx";
import { JSX, ParentProps, Show, createSignal } from "solid-js";

function RiArrowsExpandLeftLine() {
  return (
    <svg
      fill="currentColor"
      stroke-width="0"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      height="25px"
      width="25px"
      style="overflow: visible; color: white;"
    >
      <path
        fill="currentColor"
        d="m10.071 4.93 1.414 1.413L6.828 11H16v2H6.828l4.657 4.657-1.414 1.414L3 12.001l7.071-7.072ZM18.001 19V5h2v14h-2Z"
      ></path>
    </svg>
  );
}

function RiArrowsExpandRightLine() {
  return (
    <svg
      fill="currentColor"
      stroke-width="0"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      height="25px"
      width="25px"
      style="overflow: visible; color: white;"
    >
      <path
        fill="currentColor"
        d="m17.172 11-4.657-4.657 1.414-1.414L21 12l-7.07 7.071-1.415-1.414L17.172 13H8v-2h9.172ZM4 19V5h2v14H4Z"
      ></path>
    </svg>
  );
}

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
  const [visible, setVisible] = createSignal(
    !localStorage.getItem(`sidebar-${props.side}-visible`)
  );

  window.addEventListener("resize", (event) => {
    if (Number(width()) > window.innerWidth * 0.4) {
      setWidth(Math.max(window.innerWidth * 0.4, 250));
    }
  });

  return (
    <>
      <div
        class={clsx(
          "flex flex-col bg-neutral-600 shadow-2xl",
          props.side === Side.right ? "fixed h-full" : "relative"
        )}
        style={`width: ${width()}px; transition-property: left, right; transition-duration: 500ms; ${
          !visible()
            ? props.side === Side.left
              ? `left: -${width()}px`
              : `right: -${width()}px`
            : props.side === Side.left
            ? "left: 0px"
            : "right: 0px"
        }`}
      >
        <div
          class={clsx(
            "absolute top-1",
            props.side === Side.left ? "right-[-30px]" : "left-[-30px]"
          )}
          style={`transform: rotate(${
            visible() ? 0 : props.side === Side.right ? -0.5 : 0.5
          }turn); transition: transform 500ms;`}
          onclick={() => {
            setVisible((o) => !o);
            !visible()
              ? localStorage.setItem(`sidebar-${props.side}-visible`, "true")
              : localStorage.removeItem(`sidebar-${props.side}-visible`);
          }}
        >
          {props.side === Side.right ? (
            <RiArrowsExpandRightLine />
          ) : (
            <RiArrowsExpandLeftLine />
          )}
        </div>
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            if (e.button !== 0) return;
            const handleMouseMove = (e: MouseEvent) => {
              setWidth(
                Math.min(
                  window.innerWidth * 0.4,
                  Math.max(
                    250,
                    props.side === Side.left
                      ? e.clientX
                      : window.innerWidth - e.clientX
                  )
                )
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
    </>
  );
}

export function SidebarSection(props: ParentProps<{ title: JSX.Element }>) {
  const [open, setOpen] = createSignal(true);
  return (
    <div class={clsx("flex flex-col h-auto max-h-full")}>
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
