import { cx } from "cva";
import { Match } from "effect";
import { ComponentProps, For, ParentProps } from "solid-js";

type DataType = "string" | "int" | "float" | "bool";
type NodeVariant = "event" | "base" | "exec" | "pure";

export function Node(
  props: ParentProps<{
    // inputs: Array<{ name: string; type: DataType }>;
    // outputs: Array<{ name: string; type: DataType }>;
    position: { x: number; y: number };
    selected?: boolean;
  }>,
) {
  return (
    <div
      class={cx(
        "absolute rounded-lg overflow-hidden text-xs",
        "bg-black/75 border-black/75 border-2",
        props.selected && "ring-2 ring-yellow-500 opacity-100",
      )}
      style={{
        transform: `translate(${props.position.x}px, ${props.position.y}px)`,
      }}
    >
      {props.children}
      <div class="flex flex-row gap-2 text-xs text-sm">
        {/* <div class="px-1.5 py-2 flex flex-col gap-2.5 items-start">
          <For each={props.inputs}>
            {(input) => (
              <div class="flex flex-row items-center space-x-1.5 h-4.5">
                <div
                  class={cx(
                    "size-3.5 border-[2.5px] rounded-full border-current",
                    matchTypeColor(input.type),
                  )}
                />
                <span>{input.name}</span>
              </div>
            )}
          </For>
        </div>
        <div class="px-1.5 py-2 flex flex-col gap-2.5 items-end">
          <For each={props.outputs}>
            {(output) => (
              <div class="flex flex-row items-center space-x-1.5 h-4.5">
                <span>{output.name}</span>
                <div
                  class={cx(
                    "size-3.5 border-[2.5px] rounded-full border-current",
                    matchTypeColor(output.type),
                  )}
                ></div>
              </div>
            )}
          </For>
        </div> */}
      </div>
    </div>
  );
}

export function NodeHeader(
  props: { variant: NodeVariant; name: string } & ComponentProps<"button">,
) {
  return (
    <div class={cx("h-5.5 font-medium", matchNodeVariantColor(props.variant))}>
      <button {...props} class="px-1.75 h-full text-left bg-transparent w-full">
        {props.name}
      </button>
    </div>
  );
}

const matchNodeVariantColor = Match.type<NodeVariant>().pipe(
  Match.when("base", () => "bg-neutral-600"),
  Match.when("event", () => "bg-red-700"),
  Match.when("exec", () => "bg-blue-600"),
  Match.when("pure", () => "bg-emerald-700"),
  Match.exhaustive,
);

const matchTypeColor = Match.type<DataType>().pipe(
  Match.when("bool", () => "text-red-600"),
  Match.when("float", () => "text-green-600"),
  Match.when("int", () => "text-teal-300"),
  Match.when("string", () => "text-pink-500"),
  Match.exhaustive,
);
