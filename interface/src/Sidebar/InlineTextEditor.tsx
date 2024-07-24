import clsx from "clsx";
import {
  type ComponentProps,
  type JSX,
  Match,
  Switch,
  batch,
  createSignal,
  onMount,
  splitProps,
} from "solid-js";
import { Dynamic } from "solid-js/web";

export function InlineTextEditor<
  T extends keyof JSX.IntrinsicElements = "span"
>(
  props: Omit<ComponentProps<T>, "onChange"> & {
    value: string;
    onChange?(value: string): void;
    as?: T;
    class?: string;
  }
) {
  const [editing, setEditing] = createSignal(false);
  const [local, others] = splitProps(props, ["value", "onChange", "class"]);

  return (
    <div
      class={clsx(
        "flex flex-row gap-1 justify-between items-center",
        local.class
      )}
    >
      <Switch>
        <Match when={editing()}>
          {(_) => {
            const [value, setValue] = createSignal(props.value);
            let ref: HTMLInputElement;

            let focused = false;

            onMount(() => {
              setTimeout(() => {
                ref.focus();
                ref.focus();
                focused = true;
              });
            });

            return (
              <input
                ref={ref!}
                class="flex-1 bg-neutral-900 rounded text-sm py-0.5 px-1.5 border-none focus:ring-mg-focus"
                value={value()}
                onInput={(e) => {
                  setValue(e.target.value);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();

                    if (!focused) return;
                    batch(() => {
                      setEditing(false);
                      props.onChange?.(value());
                    });
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();

                    setEditing(false);
                  }
                  e.stopPropagation();
                }}
                onFocusOut={() => {
                  if (!focused) return;
                  batch(() => {
                    props.onChange?.(value());
                    setEditing(false);
                  });
                }}
              />
            );
          }}
        </Match>
        <Match when={!editing()}>
          <Dynamic
            component={(props.as ?? "span") as any}
            class="flex-1 hover:bg-white/10 rounded flex flex-row items-center justify-between py-0.5 px-1.5"
            onDblClick={(e: MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();

              setEditing(true);
            }}
            {...others}
          >
            {props.value}
            <button
              type="button"
              class="pointer-events-none opacity-0 focus:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
            >
              <IconAntDesignEditOutlined class="size-4" />
            </button>
          </Dynamic>
          {props.children}
        </Match>
      </Switch>
    </div>
  );
}
