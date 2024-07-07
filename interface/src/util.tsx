import clsx from "clsx";
import type { Accessor, Component, ComponentProps, JSX } from "solid-js";
import { createMemo } from "solid-js";
import { Dynamic } from "solid-js/web";

export function tokeniseString(s: string) {
	return s
		.toLowerCase()
		.split(" ")
		.filter((s) => s !== "");
}

export function filterWithTokenisedSearch<T>(
	tokenisedSearch: Accessor<Array<string>>,
	items: Array<readonly [Array<string>, T]>,
) {
	const ret: Array<T> = [];

	for (const [tokens, variable] of items) {
		if (
			tokenisedSearch().every((token) => tokens.some((t) => t.includes(token)))
		)
			ret.push(variable);
	}

	return ret;
}

export function createTokenisedSearchFilter<T>(
	search: Accessor<string>,
	items: Accessor<Array<readonly [Array<string>, T]>>,
) {
	const tokenisedSearch = createMemo(() => tokeniseString(search()));

	return createMemo(() => filterWithTokenisedSearch(tokenisedSearch, items()));
}

type ClassnameFactory<T> = (s: TemplateStringsArray) => T;

type TailwindFactory = {
	[K in keyof JSX.IntrinsicElements]: ClassnameFactory<
		Component<ComponentProps<K>>
	>;
} & (<T>(c: T) => ClassnameFactory<T>);

const twFactory =
	(element: any) =>
	([newClassNames, ..._]: TemplateStringsArray) =>
	(props: any) => (
		<Dynamic
			component={element}
			{...props}
			class={clsx(newClassNames, props.class)}
		/>
	);

export const tw = new Proxy((() => {}) as unknown as TailwindFactory, {
	get: (_, property: string) => twFactory(property),
	apply: (_, __, [c]: [Component]) => twFactory(c),
});
