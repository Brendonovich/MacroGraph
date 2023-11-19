import { Graph, Node, PropertyValue } from "@macrograph/core";
import { SidebarSection } from "./components/Sidebar";
import { For, Show, createMemo } from "solid-js";
import { FloatInput, SelectInput } from "./components/ui";

export function GraphSidebar(props: { graph: Graph }) {
  return (
    <>
      <SidebarSection
        title="Variables"
        right={
          <button
            class="px-1"
            onClick={(e) => {
              e.stopPropagation();
              props.graph.createVariable({
                name: `Variable ${props.graph.variables.length + 1}`,
                value: 0,
              });
            }}
          >
            +
          </button>
        }
      >
        <div class="p-2">
          <For each={props.graph.variables}>
            {(variable) => (
              <div class="flex flex-row items-center gap-2">
                <span class="shrink-0">{variable.name}:</span>
                <FloatInput
                  initialValue={variable.value}
                  onChange={(n) => props.graph.setVariableValue(variable.id, n)}
                />
              </div>
            )}
          </For>
        </div>
      </SidebarSection>
    </>
  );
}

export function NodeSidebar(props: { node: Node }) {
  return (
    <>
      <SidebarSection title="Node Info" class="p-2 space-y-2">
        <p>Name: {props.node.state.name}</p>
      </SidebarSection>
      <Show
        when={
          "properties" in props.node.schema &&
          props.node.schema.properties &&
          props.node.schema.properties
        }
      >
        {(properties) => (
          <SidebarSection title="Node Properties">
            <For each={Object.values(properties())}>
              {(property) => {
                const options = createMemo(() =>
                  property.source({ node: props.node })
                );

                const selectedOption = createMemo(() =>
                  options().find(
                    (o) => o.id === props.node.state.properties[property.id]!
                  )
                );

                return (
                  <div class="p-2 flex flex-row gap-2 items-center">
                    <span>{property.name}</span>
                    <SelectInput<PropertyValue>
                      options={options()}
                      optionValue="id"
                      optionTextValue="display"
                      getLabel={(o) => o.display}
                      value={selectedOption()}
                      onChange={(v) => {
                        props.node.state.properties[property.id] = v.id;
                      }}
                    />
                  </div>
                );
              }}
            </For>
          </SidebarSection>
        )}
      </Show>
    </>
  );
}
