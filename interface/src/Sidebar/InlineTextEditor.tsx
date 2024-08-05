import { Polymorphic } from "@kobalte/core/polymorphic";
import { createContextProvider } from "@solid-primitives/context";
import clsx from "clsx";
import {
  type ComponentProps,
  JSX,
  Match,
  ParentProps,
  Switch,
  ValidComponent,
  batch,
  createSignal,
  onMount,
  splitProps,
} from "solid-js";
import { ContextMenuItem } from "../components/Graph/ContextMenu";

export function InlineTextEditor<T extends ValidComponent = "span">(
  props: Omit<ComponentProps<T>, "onChange"> & {
    value: string;
    onChange?(value: string): void;
    as?: T;
    class?: string;
    selected?: boolean;
  },
) {
  const [local, others] = splitProps(props, ["value", "onChange", "class"]);
  const ctx = useContext() ?? createContextValue();

  return (
    <div
      class={clsx(
        "flex flex-row gap-1 justify-between items-center",
        local.class,
      )}
    >
      <Switch>
        <Match when={ctx.editing()}>
          {(_) => {
            const [value, setValue] = createSignal(props.value);
            let ref: HTMLInputElement;

            let focused = false;

            onMount(() => {
              setTimeout(() => {
                ref.focus();
                focused = true;
              }, 1);
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
                      ctx.setEditing(false);
                      props.onChange?.(value());
                    });
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    e.stopPropagation();

                    ctx.setEditing(false);
                  }
                  e.stopPropagation();
                }}
                onFocusOut={() => {
                  if (!focused) return;
                  batch(() => {
                    props.onChange?.(value());
                    ctx.setEditing(false);
                  });
                }}
              />
            );
          }}
        </Match>
        <Match when={!ctx.editing()}>
          <Polymorphic
            component={(props.as ?? "span") as any}
            class={clsx(
              "flex-1 hover:bg-white/10 rounded flex flex-row items-center justify-between py-0.5 px-1.5",
              props.selected && "bg-white/10",
            )}
            onDblClick={(e: MouseEvent) => {
              e.preventDefault();
              e.stopPropagation();

              ctx.setEditing(true);
            }}
            {...others}
          >
            {props.value}
          </Polymorphic>
          {props.children}
        </Match>
      </Switch>
    </div>
  );
}

function createContextValue() {
  const [editing, setEditing] = createSignal(false);

  return { editing, setEditing };
}

const [Context, useContext] = createContextProvider(
  () => createContextValue(),
  null,
);

export function InlineTextEditorContext(props: {
  children?: () => JSX.Element;
}) {
  return <Context>{props.children?.()}</Context>;
}
export const useInlineTextEditorCtx = useContext;
