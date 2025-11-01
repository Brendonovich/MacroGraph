import { For, type JSX, Show, Suspense } from "solid-js";
import { Dynamic } from "solid-js/web";

export function SettingsLayout<TPage extends string>(props: {
  pages: Array<{ name: string; page: TPage; Component(): JSX.Element }>;
  page: TPage;
  onChange: (page: TPage) => void;
}) {
  return (
    <div class="flex flex-row divide-x divide-gray-5 flex-1 bg-gray-2">
      <nav class="w-40 text-sm shrink-0 flex flex-col">
        <ul class="flex-1">
          <For each={props.pages}>
            {(item) => (
              <li>
                <button
                  type="button"
                  data-selected={item.page === props.page}
                  class="w-full data-[selected='true']:bg-gray-3 px-2 p-1 text-left bg-transparent focus-visible:(ring-1 ring-inset ring-yellow outline-none)"
                  onClick={() => {
                    props.onChange(item.page);
                  }}
                >
                  {item.name}
                </button>
              </li>
            )}
          </For>
        </ul>
      </nav>

      <div class="max-w-lg w-full flex flex-col items-stretch p-4 text-sm">
        <Suspense>
          <Show when={props.pages.find((page) => page.page === props.page)}>
            {(page) => <Dynamic component={page().Component} />}
          </Show>
        </Suspense>
      </div>
    </div>
  );
}
