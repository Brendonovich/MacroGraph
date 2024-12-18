import { ContextMenu } from "@kobalte/core/context-menu";
import { Dialog } from "@kobalte/core/dialog";
import {
  deserializeClipboardItem,
  graphToClipboardItem,
  serializeClipboardItem,
} from "@macrograph/clipboard";
import type { Graph } from "@macrograph/runtime";
import { deserializeGraph } from "@macrograph/runtime-serde";
import {
  For,
  Show,
  type ValidComponent,
  createMemo,
  createSignal,
} from "solid-js";

import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRenameItem,
} from "../../components/Graph/ContextMenu";
import { SidebarSection } from "../../components/Sidebar";
import { IconButton } from "../../components/ui";
import { useInterfaceContext } from "../../context";
import { Button } from "../../settings/ui";
import { createTokenisedSearchFilter, tokeniseString } from "../../util";
import { InlineTextEditor, InlineTextEditorContext } from "../InlineTextEditor";
import { SearchInput } from "../SearchInput";
import { usePlatform } from "../../platform";

interface Props {
  currentGraph?: number;
  onGraphClicked(graph: Graph): void;
}

export function Graphs(props: Props) {
  const platform = usePlatform();
  const interfaceCtx = useInterfaceContext();

  const [search, setSearch] = createSignal("");

  const tokenisedFilters = createMemo(() =>
    interfaceCtx.core.project.graphOrder
      .map((id) => {
        const g = interfaceCtx.core.project.graphs.get(id);
        if (!g) return;

        return [tokeniseString(g.name), g] as const;
      })
      .filter(Boolean),
  );

  const filteredGraphs = createTokenisedSearchFilter(search, tokenisedFilters);

  const isSearching = () => search() !== "";

  return (
    <SidebarSection title="Graphs" class="overflow-y-hidden flex flex-col">
      <div class="flex flex-row items-center w-full gap-1 p-1 border-b border-neutral-900">
        <SearchInput
          value={search()}
          onInput={(e) => {
            e.stopPropagation();
            setSearch(e.currentTarget.value);
          }}
        />
        <IconButton
          type="button"
          title="Import graph from clipboard"
          class="p-0.5"
          onClick={async (e) => {
            e.stopPropagation();
            const item = deserializeClipboardItem(
              await platform.clipboard.readText(),
            );
            if (item.type !== "graph") return;

            item.graph.id = interfaceCtx.core.project.generateGraphId();
            const graph = await deserializeGraph(
              interfaceCtx.core.project,
              item.graph,
            );
            interfaceCtx.core.project.graphs.set(graph.id, graph);
          }}
        >
          <IconGgImport class="size-4" />
        </IconButton>
        <IconButton
          type="button"
          title="Create graph"
          onClick={(e) => {
            e.stopPropagation();
            const graph = interfaceCtx.execute("createGraph");
            props.onGraphClicked(graph);
          }}
        >
          <IconMaterialSymbolsAddRounded class="size-5 stroke-2" />
        </IconButton>
      </div>
      <div class="flex-1 overflow-y-auto">
        <ul class="flex flex-col p-1 space-y-0.5">
          <For each={filteredGraphs()}>
            {(graph, i) => {
              const [deleteOpen, setDeleteOpen] = createSignal(false);

              return (
                <li class="group/item gap-1">
                  <Dialog open={deleteOpen()} onOpenChange={setDeleteOpen}>
                    <InlineTextEditorContext>
                      <ContextMenu placement="bottom-start">
                        <InlineTextEditor<ValidComponent>
                          as={(asProps) => (
                            <ContextMenu.Trigger<"button">
                              {...asProps}
                              as="button"
                              type="button"
                              onClick={() => props.onGraphClicked(graph)}
                            />
                          )}
                          selected={props.currentGraph === graph.id}
                          value={graph.name}
                          onChange={(value) => {
                            interfaceCtx.execute("setGraphName", {
                              graphId: graph.id,
                              name: value,
                            });
                          }}
                        />
                        <ContextMenuContent>
                          <ContextMenuRenameItem />
                          <ContextMenuItem
                            onSelect={() => {
                              platform.clipboard.writeText(
                                serializeClipboardItem(
                                  graphToClipboardItem(graph),
                                ),
                              );
                            }}
                          >
                            <IconTablerCopy />
                            Copy
                          </ContextMenuItem>
                          <Show when={!isSearching()}>
                            <Show when={i() !== 0}>
                              <ContextMenuItem
                                onSelect={() =>
                                  interfaceCtx.execute("moveGraphToIndex", {
                                    graphId: graph.id,
                                    currentIndex: i(),
                                    newIndex: i() - 1,
                                  })
                                }
                              >
                                <IconMaterialSymbolsArrowDropUpRounded class="transform scale-150" />
                                Move Up
                              </ContextMenuItem>
                            </Show>
                            <Show when={i() !== filteredGraphs().length - 1}>
                              <ContextMenuItem
                                onSelect={() =>
                                  interfaceCtx.execute("moveGraphToIndex", {
                                    graphId: graph.id,
                                    currentIndex: i(),
                                    newIndex: i() + 1,
                                  })
                                }
                              >
                                <IconMaterialSymbolsArrowDropDownRounded class="transform scale-150" />
                                Move Down
                              </ContextMenuItem>
                            </Show>
                          </Show>
                          <ContextMenuItem
                            class="text-red-500"
                            onSelect={() => {
                              setDeleteOpen(true);
                            }}
                          >
                            <IconAntDesignDeleteOutlined />
                            Delete
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    </InlineTextEditorContext>
                    <Dialog.Portal>
                      <Dialog.Overlay class="absolute inset-0 bg-black/40" />
                      <Dialog.Content class="absolute inset-0 flex flex-col items-center py-10 overflow-hidden mt-96">
                        <div class="flex flex-col bg-neutral-800 rounded-lg overflow-hidden">
                          <div class="flex flex-row justify-between text-white p-4">
                            <Dialog.Title>Confirm Deleting Graph?</Dialog.Title>
                          </div>
                          <div class="flex flex-row space-x-4 justify-center mb-4">
                            <Button
                              onClick={() => {
                                interfaceCtx.execute("deleteGraph", {
                                  graphId: graph.id,
                                });
                              }}
                            >
                              Delete
                            </Button>
                            <Dialog.CloseButton>
                              <Button>Cancel</Button>
                            </Dialog.CloseButton>
                          </div>
                        </div>
                      </Dialog.Content>
                    </Dialog.Portal>
                  </Dialog>
                </li>
              );
            }}
          </For>
        </ul>
      </div>
    </SidebarSection>
  );
}
