import { describe, expect, test } from "vitest";
import { parseFormatString } from "./utils";

describe("formatString", () => {
  test("Hello!", ({ task }) => {
    expect(parseFormatString(task.name)).toEqual([{ text: "Hello!" }]);
  });

  test("Hello {Name}!", ({ task }) => {
    expect(parseFormatString(task.name)).toEqual([
      { text: "Hello " },
      { variable: "Name" },
      { text: "!" },
    ]);
  });

  test("Hello {{Name}}!", ({ task }) => {
    expect(parseFormatString(task.name)).toEqual([{ text: "Hello {Name}!" }]);
  });

  test("{{{Name}}}", ({ task }) => {
    expect(parseFormatString(task.name)).toEqual([
      { text: "{" },
      { variable: "Name" },
      { text: "}" },
    ]);
  });
});
