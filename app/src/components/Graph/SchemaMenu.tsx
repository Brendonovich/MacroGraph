import clsx from "clsx";
import { createMemo, createSignal, For, onMount, Show } from "solid-js";

import { useCore } from "~/contexts";
import { XY, Package, NodeSchema, NodeSchemaVariant } from "@macrograph/core";
import { useGraph } from "./Graph";
import { useUIStore } from "~/UIStore";

interface Props {
  onSchemaClicked(s: NodeSchema): void | Promise<void>;
  position: XY;
}

const TypeIndicatorColours: Record<NodeSchemaVariant, string> = {
  Base: "bg-gray-base",
  Exec: "bg-blue-exec",
  Event: "bg-red-event",
  Pure: "bg-green-pure",
};

export const SchemaMenu = (props: Props) => {
  const core = useCore();

  const [openPackages, setOpenPackages] = createSignal(new Set<Package>());
  const [search, setSearch] = createSignal("");

  const lowercaseSearchTokens = createMemo(() =>
    search()
      .toLowerCase()
      .split(" ")
      .filter((s) => s !== "")
  );

  let searchRef: HTMLInputElement;

  onMount(() => searchRef.focus());

  const graph = useGraph();
  const UI = useUIStore();

  return (
    <div
      class="flex flex-col bg-neutral-900 border-white text-white border absolute z-10 w-80 h-[30rem] rounded-md shadow-md overflow-hidden text-sm"
      style={{
        left: props.position.x - 20 + "px",
        top: props.position.y - 20 + "px",
      }}
    >
      <div class="p-2">
        <input
          ref={searchRef!}
          onInput={(e) => setSearch(e.target.value)}
          value={search()}
          class="text-black w-full px-2 py-0.5 rounded"
          placeholder="Search Nodes..."
          autocomplete="false"
          autoCapitalize="off"
          autocorrect="off"
          spellcheck={false}
          tabindex={0}
        />
      </div>
      <div class="p-2 pt-0 flex-1 overflow-auto">
        <div>
          <button
            class="px-2 py-0.5 flex flex-row items-center space-x-2 hover:bg-neutral-700 min-w-full text-left rounded-md"
            onClick={() => {
              graph().createCommentBox({
                position: UI.toGraphSpace(props.position),
                size: {
                  x: 400,
                  y: 200,
                },
                text: "Comment",
              });
              UI.setSchemaMenuPosition();
            }}
          >
            Add Comment Box
          </button>

          <For each={core.packages}>
            {(p) => {
              const open = () => openPackages().has(p) || search() !== "";

              const filteredSchemas = createMemo(() => {
                const lowercasePackageName = p.name.toLowerCase();

                const leftoverSearchTokens = lowercaseSearchTokens().filter(
                  (s) => !lowercasePackageName.startsWith(s)
                );

                return p.schemas.filter((s) => {
                  let lowercaseSchemaName = s.name.toLowerCase();

                  return leftoverSearchTokens.every((t) =>
                    lowercaseSchemaName.includes(t)
                  );
                });
              });

              return (
                <Show when={search() === "" || filteredSchemas().length !== 0}>
                  <div>
                    <button
                      class="px-2 py-0.5 flex flex-row items-center space-x-2 hover:bg-neutral-700 min-w-full text-left rounded-md"
                      onClick={() =>
                        setOpenPackages((s) => {
                          if (s.has(p)) s.delete(p);
                          else s.add(p);

                          return new Set(s);
                        })
                      }
                    >
                      <div class="w-2">{open() ? "v" : ">"}</div>
                      <span>{p.name}</span>
                    </button>
                    <Show when={open()}>
                      <div class="pl-4">
                        <For each={filteredSchemas()}>
                          {(s) => (
                            <div>
                              <button
                                class="px-2 py-0.5 flex flex-row items-center space-x-2 whitespace-nowrap min-w-full text-left hover:bg-neutral-700 rounded-lg"
                                onClick={() => props.onSchemaClicked(s)}
                              >
                                <div
                                  class={clsx(
                                    "h-3 w-3 rounded-full",
                                    TypeIndicatorColours[
                                      "variant" in s ? s.variant : "Event"
                                    ]
                                  )}
                                />
                                <span>{s.name}</span>
                              </button>
                            </div>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>
                </Show>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
};
