import {
	DEFAULT,
	type Node,
	type PropertyValue,
	type SchemaProperties,
	graphRefOf,
} from "@macrograph/runtime";
import { For, Match, Show, Switch, createMemo } from "solid-js";

import { SidebarSection } from "../../components/Sidebar";
import {
	CheckBox,
	FloatInput,
	IntInput,
	SelectInput,
	TextInput,
} from "../../components/ui";
import { useInterfaceContext } from "../../context";

export function Properties(props: {
	node: Node;
	properties: SchemaProperties;
}) {
	const interfaceCtx = useInterfaceContext();

	const visibleProperties = createMemo(() =>
		Object.values(props.properties).filter((property) => {
			if (property.id === "file")
				return !!props.node.state.properties["useFilePicker"];
			return true;
		}),
	);

	return (
		<SidebarSection title="Node Properties">
			<For
				each={visibleProperties()}
				fallback={
					<div class="text-center pt-6 w-full text-neutral-400">
						Node has no properties
					</div>
				}
			>
				{(property) => {
					const properties = createMemo(() => props.node.state.properties);

					return (
						<div class="p-2 space-y-1">
							<span class="text-xs font-medium text-gray-200">
								{property.name}
							</span>
							<Switch>
								<Match when={"source" in property && property}>
									{(property) => {
										const options = createMemo(() => {
											return property().source({ node: props.node });
										});

										const selectedOption = () => {
											return options().find(
												(o) => o.id === properties()[property().id]!,
											);
										};

										return (
											<SelectInput<PropertyValue>
												options={options()}
												optionValue="id"
												optionTextValue="display"
												getLabel={(o) =>
													// Make Enum can be undefined temporarily
													o?.display
												}
												value={selectedOption()}
												onChange={(v) => {
													interfaceCtx.execute("setNodeProperty", {
														...graphRefOf(props.node.graph),
														nodeId: props.node.id,
														propertyId: property().id,
														value: v.id,
													});
												}}
											/>
										);
									}}
								</Match>
								<Match when={"type" in property && property}>
									{(property) => {
										const value = createMemo(
											() => properties()[property().id]!,
										);

										const onChange = (v: any) => {
											interfaceCtx.execute("setNodeProperty", {
												...graphRefOf(props.node.graph),
												nodeId: props.node.id,
												propertyId: property().id,
												value: v,
											});
										};

										return (
											<Show
												when={(() => {
													const v = value();
													return v !== "symbol" && v !== undefined;
												})()}
											>
												<Switch>
													<Match
														when={property().type.primitiveVariant() === "bool"}
													>
														<CheckBox
															value={value() as any}
															onChange={onChange}
														/>
													</Match>
													<Match
														when={
															property().type.primitiveVariant() === "string"
														}
													>
														<div class="flex gap-1">
															<TextInput
																class="flex-1 min-w-0"
																value={value() as any}
																onChange={onChange}
															/>
															<Show when={"filePicker" in property()}>
																<button
																	type="button"
																	title="Browse"
																	onClick={async () => {
																		const file =
																			await (
																				property() as any
																			).filePicker();
																		if (file) onChange(file);
																	}}
																	class="px-2 py-0.5 text-xs bg-neutral-600 hover:bg-neutral-500 rounded"
																>
																	Browse
																</button>
															</Show>
														</div>
													</Match>
													<Match
														when={property().type.primitiveVariant() === "int"}
													>
														<IntInput
															initialValue={value() as any}
															value={value() as any}
															onChange={onChange}
														/>
													</Match>
													<Match
														when={
															property().type.primitiveVariant() === "float"
														}
													>
														<FloatInput
															initialValue={value() as any}
															value={value() as any}
															onChange={onChange}
														/>
													</Match>
												</Switch>
											</Show>
										);
									}}
								</Match>
								<Match when={"resource" in property && property}>
									{(property) => {
										const interfaceCtx = useInterfaceContext();

										const items = () => {
											const resource = interfaceCtx.core.project.resources.get(
												property().resource,
											);
											if (!resource) return [];

											const dflt = resource.items.find(
												(i) => i.id === resource.default,
											);

											return [
												{
													id: DEFAULT,
													name: dflt
														? `Default (${dflt.name})`
														: "No Items Available",
												},
												...resource.items,
											];
										};

										const valueId = createMemo(
											() => props.node.state.properties[property().id],
										);

										return (
											<SelectInput
												options={items()}
												optionValue="id"
												optionTextValue="name"
												getLabel={(o) => o.name}
												value={
													items().find((i) => i.id === valueId()) ??
													items().find((i) => i.id === DEFAULT)
												}
												onChange={(v) => {
													interfaceCtx.execute("setNodeProperty", {
														...graphRefOf(props.node.graph),
														nodeId: props.node.id,
														propertyId: property().id,
														value: v.id,
													});
												}}
											/>
										);
									}}
								</Match>
							</Switch>
						</div>
					);
				}}
			</For>
		</SidebarSection>
	);
}
