import { test, expect, describe } from "vitest";
import {
  connectWildcardsInTypes,
  disconnectWildcardsInTypes,
  None,
  Wildcard,
  t,
} from ".";

test("Connect String + Wildcard", () => {
  // Node 1
  const output = t.string();

  // Node 2
  const wildcard = new Wildcard("");
  const input = t.wildcard(wildcard);

  connectWildcardsInTypes(output, input);

  expect(wildcard.value().expect("No wildcard value!")).toBe(output);
});

test("Connect String + Wildcard + Wildcard", () => {
  // Node 1
  const output1 = t.string();

  // Node 2
  const wildcard2 = new Wildcard("2");
  const input2 = t.wildcard(wildcard2);

  connectWildcardsInTypes(output1, input2);

  expect(wildcard2.value().unwrap()).toBe(output1);

  const output2 = t.wildcard(wildcard2);

  // Node 3
  const wildcard3 = new Wildcard("3");
  const input3 = t.wildcard(wildcard3);

  expect(wildcard3.value().isNone()).toBe(true);

  connectWildcardsInTypes(output2, input3);

  expect(wildcard3.value().unwrap()).toBe(output1);
});

test("Connect Map<String> + Map<Wildcard>", () => {
  // Node 1
  const output = t.map(t.string());

  // Node 2
  const wildcard = new Wildcard("");
  const input = t.map(t.wildcard(wildcard));

  expect(wildcard.value().isNone()).toBe(true);

  connectWildcardsInTypes(output, input);

  expect(wildcard.value().unwrap()).toBe(output.value);
});

describe("Connect Map<String> + Map<Wildcard> + Map<Wildcard>", () => {
  function setup() {
    // Node 1
    const output1 = t.map(t.string());

    // Node 2
    const wildcard2 = new Wildcard("2");
    const input2 = t.map(t.wildcard(wildcard2));
    const output2 = t.map(t.wildcard(wildcard2));

    // Node 3
    const wildcard3 = new Wildcard("3");
    const input3 = t.map(t.wildcard(wildcard3));

    return {
      output1,
      wildcard2,
      input2,
      output2,
      wildcard3,
      input3,
    };
  }

  test("Connect Forwards", () => {
    const { output1, wildcard2, input2, output2, wildcard3, input3 } = setup();

    connectWildcardsInTypes(output1, input2);
    connectWildcardsInTypes(output2, input3);

    expect(wildcard2.value().unwrap()).toBe(output1.value);
    expect(wildcard3.value().unwrap()).toBe(output1.value);
  });

  test("Connect Backwards", () => {
    const { output1, wildcard2, input2, output2, wildcard3, input3 } = setup();

    connectWildcardsInTypes(output2, input3);
    connectWildcardsInTypes(output1, input2);

    expect(wildcard2.value().unwrap()).toBe(output1.value);
    expect(wildcard3.value().unwrap()).toBe(output1.value);
  });
});

describe("Connect Map<String> + Wildcard(A) + Map<Wildcard(B)>", () => {
  function setup() {
    // Node 1
    const output1 = t.map(t.string());

    // Node 2
    const wildcard2 = new Wildcard("2");
    const input2 = t.wildcard(wildcard2);
    const output2 = t.wildcard(wildcard2);

    // Node 3
    const wildcard3 = new Wildcard("3");
    const input3 = t.map(t.wildcard(wildcard3));

    return {
      output1,
      wildcard2,
      input2,
      output2,
      wildcard3,
      input3,
    };
  }

  test("Connect Forward", () => {
    const { output1, wildcard2, input2, output2, wildcard3, input3 } = setup();

    connectWildcardsInTypes(output1, input2);
    connectWildcardsInTypes(output2, input3);

    expect(wildcard2.value().expect("wildcard2 value empty")).toBe(output1);
    expect(wildcard3.value().expect("wildcard3 value empty")).toBe(
      output1.value
    );
  });

  test("Connect Backwards", () => {
    const { output1, wildcard2, input2, output2, wildcard3, input3 } = setup();

    connectWildcardsInTypes(output2, input3);
    connectWildcardsInTypes(output1, input2);

    expect(wildcard2.value().unwrap()).toBe(input3);
    expect(wildcard3.value().unwrap()).toBe(output1.value);
  });

  test("Disconnect Forward", () => {
    const { output1, wildcard2, input2, output2, wildcard3, input3 } = setup();

    connectWildcardsInTypes(output1, input2);
    connectWildcardsInTypes(output2, input3);

    expect(wildcard3.value().unwrap()).toBe(output1.value);

    disconnectWildcardsInTypes(output1, input2);

    expect(wildcard2.value().unwrap()).toBe(input3);
    expect(wildcard3.value()).toBe(None);

    disconnectWildcardsInTypes(output2, input3);

    expect(wildcard2.value()).toBe(None);
    expect(wildcard3.value()).toBe(None);
  });

  test("Disconnect Backwards", () => {
    const { output1, wildcard2, input2, output2, wildcard3, input3 } = setup();

    connectWildcardsInTypes(output2, input3);
    connectWildcardsInTypes(output1, input2);

    expect(wildcard3.value().unwrap()).toBe(output1.value);
    expect(input3).toBe(wildcard2.value().unwrap());

    disconnectWildcardsInTypes(output2, input3);

    expect(wildcard2.value().unwrap()).toBe(output1);
    expect(wildcard3.value()).toBe(None);

    disconnectWildcardsInTypes(output1, input2);

    expect(wildcard2.value()).toBe(None);
    expect(wildcard3.value()).toBe(None);
  });
});

describe("connecting two types", () => {
  test("T", async () => {
    const wildcard = new Wildcard("");

    const type1 = t.wildcard(wildcard);
    const type2 = t.string();

    connectWildcardsInTypes(type1, type2);

    expect(type1.wildcard.value().unwrap()).toBe(type2);
  });
  test("List<T>", () => {
    const wildcard = new Wildcard("");

    const type1 = t.list(t.wildcard(wildcard));
    const type2 = t.list(t.string());

    connectWildcardsInTypes(type1, type2);

    expect(type1.item.wildcard.value().unwrap()).toBe(type2.item);
  });
  test("Option<T>", () => {
    const wildcard = new Wildcard("");

    const type1 = t.option(t.wildcard(wildcard));
    const type2 = t.option(t.string());

    connectWildcardsInTypes(type1, type2);

    expect(type1.inner.wildcard.value().unwrap()).toBe(type2.inner);
  });
  test("Option<List<T>>", () => {
    const wildcard = new Wildcard("");

    const type1 = t.option(t.list(t.wildcard(wildcard)));
    const type2 = t.option(t.list(t.string()));

    connectWildcardsInTypes(type1, type2);

    expect(type1.inner.item.wildcard.value().unwrap()).toBe(type2.inner.item);
  });
});

describe("connecting two groups", () => {
  test("T", () => {
    const wildcard1 = new Wildcard("1");
    const wildcard1Out = t.wildcard(wildcard1);

    const wildcard2 = new Wildcard("2");
    const wildcard2In = t.wildcard(wildcard2);
    const wildcard2Out = t.wildcard(wildcard2);

    const bool = t.string();

    connectWildcardsInTypes(wildcard1Out, wildcard2In);
    connectWildcardsInTypes(wildcard2Out, bool);

    expect(wildcard2.value().unwrap()).toBe(bool);
    expect(wildcard1.value().unwrap()).toBe(bool);
  });
});
