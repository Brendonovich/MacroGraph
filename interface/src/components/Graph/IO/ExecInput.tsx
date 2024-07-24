import type { ExecInput as ExecInputModel } from "@macrograph/runtime";
import { Show } from "solid-js";

import { usePin } from "./usePin";

interface Props {
  input: ExecInputModel;
}

export const ExecInput = (props: Props) => {
  const { ref, active, dim } = usePin(() => props.input);

  return (
    <div class="flex flex-row items-center space-x-1.5 h-5">
      <div
        ref={ref}
        data-dim={dim()}
        class="transition-opacity data-[dim=true]:opacity-20"
      >
        <svg
          aria-hidden="true"
          style={{ "pointer-events": "all" }}
          viewBox="0 0 14 17.5"
          class="w-3.5 text-transparent hover:text-white pointer-events-[all]"
          fill={
            props.input.connections.size > 0 || active()
              ? "white"
              : "currentColor"
          }
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12.6667 8.53812C13.2689 9.03796 13.2689 9.96204 12.6667 10.4619L5.7983 16.1622C4.98369 16.8383 3.75 16.259 3.75 15.2003L3.75 3.79967C3.75 2.74104 4.98369 2.16171 5.79831 2.83779L12.6667 8.53812Z"
            stroke="white"
            stroke-width="1.5"
          />
        </svg>
      </div>
      <Show when={props.input.name}>{(name) => <span>{name()}</span>}</Show>
    </div>
  );
};
