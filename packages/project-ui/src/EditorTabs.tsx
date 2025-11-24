import { type Accessor, createMemo, For, type JSX, Show } from "solid-js";

export function EditorTabs<
  TSchema extends { type: string; tabId: number },
>(props: {
  schema: {
    [K in TSchema["type"]]: {
      Component(state: Accessor<Extract<TSchema, { type: K }>>): JSX.Element;
      getMeta(state: Extract<TSchema, { type: K }>): {
        title: string;
        desc?: string;
      };
    };
  };
  state: Array<TSchema & { tabId: number }>;
  selectedTabId?: number | null;
  onChange?: (tabId: number) => void;
  onRemove?: (tabId: number) => void;
}) {
  const selectedTabState = createMemo(() =>
    props.state.find((s) => s.tabId === props.selectedTabId),
  );

  const Component = createMemo(() => {
    const type = selectedTabState()?.type;
    if (type) return props.schema[type as keyof typeof props.schema].Component;
  });

  return (
    <div class="flex flex-col items-stretch flex-1 overflow-hidden">
      <Show when={props.state.length > 0}>
        <ul class="flex flex-row items-start divide-x divide-gray-5 overflow-x-auto scrollbar-none shrink-0">
          <For each={props.state}>
            {(tab) => {
              const meta = () =>
                props.schema[tab.type as keyof typeof props.schema].getMeta(
                  tab as any,
                );

              return (
                <li
                  class="h-8 relative group"
                  data-selected={tab.tabId === props.selectedTabId}
                >
                  <button
                    type="button"
                    class="h-full px-4 flex flex-row items-center bg-gray-3 group-data-[selected='true']:(bg-gray-2 border-transparent) border-b border-gray-5 focus-visible:(ring-1 ring-inset ring-yellow outline-none) text-nowrap"
                    onClick={() => props.onChange?.(tab.tabId)}
                  >
                    <span>{meta().title}</span>
                    <Show when={meta().desc}>
                      {(desc) => (
                        <span class="ml-1 text-xs text-gray-11">{desc()}</span>
                      )}
                    </Show>
                  </button>
                  <div class="opacity-0 group-hover:opacity-100 focus-within:opacity-100 absolute inset-y-0.5 pl-2 pr-1 right-0 flex items-center justify-center bg-gradient-to-gray-3 to-20% group-data-[selected='true']:(bg-gradient-to-gray-2 to-20%) bg-gradient-to-r from-transparent">
                    <button
                      type="button"
                      class="bg-transparent hover:bg-gray-6 p-0.5 focus-visible:(ring-1 ring-yellow outline-none bg-gray-6)"
                      onClick={() => props.onRemove?.(tab.tabId)}
                    >
                      <IconBiX class="size-3.5" />
                    </button>
                  </div>
                </li>
              );
            }}
          </For>
          <div class="h-full flex-1 border-b border-gray-5" />
        </ul>
        <Show when={selectedTabState()}>
          {(selectedTabState) => (
            <div class="w-full h-full bg-gray-2 flex flex-col overflow-hidden">
              {Component()?.(selectedTabState as any)}
            </div>
          )}
        </Show>
      </Show>
    </div>
  );
}
