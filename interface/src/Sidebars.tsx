import { DataInput as DataInputModel, Graph, Node } from "@macrograph/core";
import { SidebarSection } from "./components/Sidebar";
import { For, Match, Show, Switch } from "solid-js";
import { TextArea } from "@kobalte/core/dist/types/text-field";

export function GraphSidebar(_: { graph: Graph }) {
  return (
    <>
      <SidebarSection title="Variables"></SidebarSection>
    </>
  );
}

export function NodeSidebar(props: { node: Node }) {
  return (
    <>
      <SidebarSection title="Node Properties">
        <div class="pl-1 text-white">
          <p>Name: {props.node.state.name}</p>
          <p>
            position: {Math.floor(props.node.state.position.x)},{" "}
            {Math.floor(props.node.state.position.y)}
          </p>

          <For each={props.node.state.inputs}>
            {(i) => (
              <Switch>
                <Match when={i instanceof DataInputModel ? i : null}>
                  {(i) => (
                    <p class="pr-2">
                      {i().id}:{" "}
                      {typeof i().defaultValue === "string" ? (
                        <textarea
                          wrap="hard"
                          value={i().defaultValue?.toString()}
                          onchange={(e) => i().setDefaultValue(e.target.value)}
                          class="flex flex-row items-center w-full border border-gray-300 rounded bg-black focus:border-yellow-500 focus:ring-0 "
                        ></textarea>
                      ) : (
                        <p>{i().defaultValue}</p>
                      )}
                    </p>
                  )}
                </Match>
              </Switch>
            )}
          </For>
        </div>
      </SidebarSection>
    </>
  );
}
