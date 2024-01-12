import { For, Match, Switch, createMemo, createSignal } from "solid-js";
import { Graph } from "@macrograph/runtime";
import { Dialog, DropdownMenu, Select } from "@kobalte/core";

import { useCore, useCoreContext } from "../../contexts";
import { GraphItem } from "./GraphItem";
import { SidebarSection } from "../Sidebar";
import { deserializeClipboardItem, readFromClipboard } from "../../clipboard";
import { SelectInput } from "../ui";

export function Resources() {
  const core = useCore();

  const resourceTypes = createMemo(() =>
    core.packages
      .map((p) => {
        if (p.resources.size > 0) return [p, [...p.resources]] as const;
      })
      .filter(Boolean)
  );
  const resources = createMemo(() => [...core.project.resources]);

  return (
    <SidebarSection
      title="Resources"
      right={
        <div class="flex flex-row space-x-2  items-center ">
          <DropdownMenu.Root placement="bottom-end">
            <DropdownMenu.Trigger
              class="text-xl font-bold"
              onClick={(e) => e.stopPropagation()}
            >
              +
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content class="p-2 bg-black border border-gray-300 w-52 max-h-48 flex flex-col overflow-y-auto text-white">
                <For each={resourceTypes()}>
                  {([pkg, types]) => (
                    <>
                      <span>{pkg.name}</span>
                      <For each={types}>
                        {(type) => (
                          <DropdownMenu.Item
                            as="button"
                            class="flex flex-row items-center w-full px-2 py-1 text-left hover:bg-white/20"
                            onSelect={() => {
                              core.project.createResource({
                                type,
                                name: "New Resource",
                              });
                            }}
                          >
                            {type.name}
                          </DropdownMenu.Item>
                        )}
                      </For>
                    </>
                  )}
                </For>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      }
    >
      <ul class="p-2">
        <For each={resources()}>
          {([type, data]) => (
            <li>
              <p>{type.name}</p>
              <ul>
                <For each={data.items}>
                  {(item, index) => {
                    const [editingName, setEditingName] = createSignal(false);

                    return (
                      <li>
                        <div class="flex flex-row gap-2 justify-between items-center">
                          <Switch>
                            <Match when={editingName()}>
                              {(_) => {
                                const [value, setValue] = createSignal(
                                  item.name
                                );

                                return (
                                  <>
                                    <input
                                      class="flex-1 text-black"
                                      value={value()}
                                      onChange={(e) => setValue(e.target.value)}
                                    />
                                    <div class="flex flex-row">
                                      <button
                                        class="w-6 h-6 flex flex-row items-center justify-center"
                                        onClick={() => {
                                          item.name = value();
                                          setEditingName(false);
                                          core.project.save();
                                        }}
                                      >
                                        <IconAntDesignCheckOutlined />
                                      </button>
                                      <button
                                        class="w-6 h-6 relative"
                                        onClick={() => setEditingName(false)}
                                      >
                                        <IconBiX class="absolute left-0 top-0" />
                                      </button>
                                    </div>
                                  </>
                                );
                              }}
                            </Match>
                            <Match when={!editingName()}>
                              <span class="shrink-0">{item.name}</span>
                              <div class="gap-2 flex flex-row">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    setEditingName(true);
                                  }}
                                >
                                  <IconAntDesignEditOutlined />
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();

                                    data.items.splice(index(), 1);
                                    core.project.save();
                                  }}
                                >
                                  <IconAntDesignDeleteOutlined />
                                </button>
                              </div>
                            </Match>
                          </Switch>
                        </div>
                        <SelectInput
                          options={type.sources()}
                          optionValue="id"
                          optionTextValue="display"
                          getLabel={(i) => i.display}
                          onChange={(source) => (item.sourceId = source.id)}
                          value={type
                            .sources()
                            .find((s) => s.id === item.sourceId)}
                        />
                      </li>
                    );
                  }}
                </For>
              </ul>
            </li>
          )}
        </For>
      </ul>
    </SidebarSection>
  );
}

// React component to show a list of projects
interface Props {
  currentGraph?: number;
  onGraphClicked(graph: Graph): void;
}

export function GraphList(props: Props) {
  const ctx = useCoreContext();

  return (
    <SidebarSection
      title="Graphs"
      right={
        <div class="flex flex-row items-center text-xl font-bold">
          <button
            class="px-1"
            onClick={async (e) => {
              e.stopPropagation();
              const item = deserializeClipboardItem(await readFromClipboard());
              if (item.type !== "graph") return;

              item.graph.id = ctx.core.project.generateGraphId();
              const graph = Graph.deserialize(ctx.core.project, item.graph);
              ctx.core.project.graphs.set(graph.id, graph);
            }}
          >
            <IconGgImport />
          </button>
          <button
            class="px-1"
            onClick={(e) => {
              e.stopPropagation();
              const graph = ctx.core.project.createGraph();
              props.onGraphClicked(graph);
            }}
          >
            +
          </button>
        </div>
      }
    >
      <For each={[...ctx.core.project.graphs.values()]}>
        {(graph) => (
          <GraphItem
            graph={graph}
            onClick={() => props.onGraphClicked(graph)}
            isCurrentGraph={graph.id === props.currentGraph}
          />
        )}
      </For>
    </SidebarSection>
  );
}
