export function tokeniseString(s: string) {
	return s
		.toLowerCase()
		.split(" ")
		.filter((s) => s !== "");
}
