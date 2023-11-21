import { describe, expect, test } from "vitest";
import { parseFormatString } from "./utils";

describe("formatString", () => {
  test("Hello!", ({ meta }) => {
    expect(parseFormatString(meta.name)).toEqual([{ text: "Hello!" }]);
  });

  test("Hello {Name}!", ({ meta }) => {
    expect(parseFormatString(meta.name)).toEqual([
      { text: "Hello " },
      { variable: "Name" },
      { text: "!" },
    ]);
  });

  test("Hello {{Name}}!", ({ meta }) => {
    expect(parseFormatString(meta.name)).toEqual([{ text: "Hello {Name}!" }]);
  });

  test("{{{Name}}}", ({ meta }) => {
    expect(parseFormatString(meta.name)).toEqual([
      { text: "{" },
      { variable: "Name" },
      { text: "}" },
    ]);
  });
});
