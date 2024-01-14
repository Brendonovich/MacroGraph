import { Combobox, Popover } from "@kobalte/core";
import clsx from "clsx";
import {
  For,
  ResourceReturn,
  createMemo,
  getOwner,
  on,
  onMount,
  runWithOwner,
} from "solid-js";
import {
  Show,
  Suspense,
  createEffect,
  createResource,
  createSignal,
} from "solid-js";

interface Props {
  value: string;
  onChange(v: string): void;
  class?: string;
  fetchSuggestions?(): Promise<string[]>;
}

export const TextInput = (props: Props) => {
  const [open, setOpen] = createSignal<"inputFocused" | "popoverFocused">();

  const resource = createMemo<ResourceReturn<string[]> | undefined>((prev) => {
    if (prev) return prev;

    if (open() !== undefined)
      return createResource(
        () => props.fetchSuggestions?.(),
        () => {
          return props.fetchSuggestions?.() ?? [];
        }
      );
  });

  return (
    <Popover.Root open={open() !== undefined} placement="bottom" gutter={4}>
      <Popover.Anchor>
        <input
          value={props.value}
          onInput={(e) => props.onChange(e.target.value)}
          onFocus={() => setTimeout(() => setOpen("inputFocused"), 1)}
          onMouseDown={() => setOpen("inputFocused")}
          class={clsx(
            "w-full text-xs h-5 px-1 border border-gray-300 rounded bg-black focus:border-yellow-500 focus:ring-0",
            props.class
          )}
        />
      </Popover.Anchor>
      <Popover.Portal>
        <Show when={open()}>
          <Popover.Content
            as="ul"
            class="max-w-4 max-h-48 bg-black text-white overflow-y-auto text-sm rounded overflow-x-hidden border border-neutral-700"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={() => setOpen()}
          >
            <Suspense>
              <Show when={resource()} keyed>
                {([options, { refetch }]) => {
                  const [mounted, setMounted] = createSignal(false);
                  const [shouldFilter, setShouldFilter] = createSignal(false);

                  onMount(() => {
                    refetch();
                    setMounted(true);
                  });

                  createEffect(
                    on(
                      () => props.value,
                      () => {
                        console.log(props.value);
                        if (mounted()) setShouldFilter(true);
                      },
                      { defer: true }
                    )
                  );

                  const filteredOptions = createMemo(() => {
                    if (shouldFilter())
                      return (
                        options.latest?.filter((o) =>
                          o.toLowerCase().includes(props.value.toLowerCase())
                        ) ?? []
                      );

                    return options.latest;
                  });

                  return (
                    <For each={filteredOptions()}>
                      {(option) => (
                        <li
                          onClick={() => {
                            props.onChange(option);
                            console.log(option);
                            setOpen();
                          }}
                          class="w-full px-2 py-1 hover:bg-white/20"
                        >
                          {option}
                        </li>
                      )}
                    </For>
                  );
                }}
              </Show>
            </Suspense>
          </Popover.Content>
        </Show>
      </Popover.Portal>
    </Popover.Root>
  );
};
