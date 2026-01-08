export const tokeniseString = (s: string) =>
	s
		.toLowerCase()
		.split(" ")
		.filter((s) => s !== "");
