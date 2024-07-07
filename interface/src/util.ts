import type { Accessor } from "solid-js";
import { createMemo } from "solid-js";

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
