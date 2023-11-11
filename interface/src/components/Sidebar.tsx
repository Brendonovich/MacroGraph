import { JSX, ParentProps } from "solid-js";

export function Sidebar(props: ParentProps) {
  return (
    <div {...props} class="flex flex-col bg-neutral-600 w-64 shadow-2xl" />
  );
}

export function SidebarSection(props: ParentProps<{ title: JSX.Element }>) {
  return (
    <div class="flex-1 flex flex-col overflow-y-hidden">
      <div class="flex flex-row justify-between items-center bg-neutral-900 text-white px-2 font-medium shadow py-1">
        {props.title}
      </div>
      {props.children}
    </div>
  );
}
