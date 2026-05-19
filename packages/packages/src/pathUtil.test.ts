import { describe, expect, test } from "vitest";

import { sanitizeFilePath } from "./pathUtil";

describe("sanitizeFilePath", () => {
	test("removes surrounding spaces", () => {
		expect(sanitizeFilePath(" C:\\Users\\a\\b.mp4 ")).toBe("C:\\Users\\a\\b.mp4");
	});

	test("removes invisible bidi marks", () => {
		expect(sanitizeFilePath("\u202AC:\\Users\\a\\b.mp4")).toBe("C:\\Users\\a\\b.mp4");
	});

	test("removes internal spaces from accidental paste", () => {
		expect(sanitizeFilePath("C:\\Users\\a\\te st.mp4")).toBe("C:\\Users\\a\\test.mp4");
	});

	test("normalizes forward slashes on Windows drive paths", () => {
		expect(sanitizeFilePath("C:/Users/a/test.mp4")).toBe("C:\\Users\\a\\test.mp4");
	});

	test("strips surrounding quotes", () => {
		expect(sanitizeFilePath('"C:\\Users\\a\\test.mp4"')).toBe("C:\\Users\\a\\test.mp4");
	});
});
