export function makeCache<T>(fn: () => Promise<T>) {
	let value: Promise<T> | undefined;

	return async () => {
		value ??= fn();
		return await value;
	};
}
