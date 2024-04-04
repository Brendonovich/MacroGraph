import { ParentProps } from "solid-js";

export default function (props: ParentProps) {
  return (
    <main class="w-full flex-1 flex flex-col justify-center items-center overflow-y-hidden">
      <div class="h-full w-full max-w-3xl p-4">{props.children}</div>
    </main>
  );
}
