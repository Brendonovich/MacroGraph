import { test, expect, describe } from "vitest";
import { Option, None, Some } from "./option";
// import { t } from ".";
// import { connectWildcardsInTypes, Wildcard } from "./wildcard";

// describe("connecting two types", () => {
//   test("T", async () => {
//     const wildcard = new Wildcard("");

//     const type1 = t.wildcard(wildcard);
//     const type2 = t.bool();

//     connectWildcardsInTypes(type1, type2);

//     expect(type1.wildcard.value().unwrap()).toBe(type2);
//   });
//   test("List<T>", () => {
//     const wildcard = new Wildcard("");

//     const type1 = t.list(t.wildcard(wildcard));
//     const type2 = t.list(t.string());

//     connectWildcardsInTypes(type1, type2);

//     expect(type1.inner.wildcard.value().unwrap()).toBe(type2.inner);
//   });
//   test("Option<T>", () => {
//     const wildcard = new Wildcard("");

//     const type1 = t.option(t.wildcard(wildcard));
//     const type2 = t.option(t.int());

//     connectWildcardsInTypes(type1, type2);

//     expect(type1.inner.wildcard.value().unwrap()).toBe(type2.inner);
//   });
//   test("Option<List<T>>", () => {
//     const wildcard = new Wildcard("");

//     const type1 = t.option(t.list(t.wildcard(wildcard)));
//     const type2 = t.option(t.list(t.float()));

//     connectWildcardsInTypes(type1, type2);

//     expect(type1.inner.inner.wildcard.value().unwrap()).toBe(type2.inner.inner);
//   });
// });

// describe("connecting two groups", () => {
//   test("T", () => {
//     const wildcard1 = new Wildcard("1");
//     const wildcard1Out = t.wildcard(wildcard1);

//     const wildcard2 = new Wildcard("2");
//     const wildcard2In = t.wildcard(wildcard2);
//     const wildcard2Out = t.wildcard(wildcard2);

//     const bool = t.bool();

//     connectWildcardsInTypes(wildcard1Out, wildcard2In);
//     connectWildcardsInTypes(wildcard2Out, bool);

//     expect(wildcard2.value().unwrap()).toBe(bool);
//     expect(wildcard1.value().unwrap()).toBe(bool);
//   });
// });

import {
  getOwner,
  onCleanup,
  createRoot,
  createEffect,
  createSignal,
  Accessor,
  Setter,
  runWithOwner,
  createMemo,
  batch,
  untrack,
} from "solid-js";
import { ReactiveMap } from "@solid-primitives/map";
import { ReactiveSet } from "@solid-primitives/set";

abstract class BaseType {}

class StringType extends BaseType {}

class ListType<T extends BaseType> extends BaseType {
  constructor(public item: T) {
    super();
  }
}

class MapType<T extends BaseType> extends BaseType {
  constructor(public value: T) {
    super();
  }
}

class OptionType<T extends BaseType> extends BaseType {
  constructor(public inner: T) {
    super();
  }
}

class WildcardType extends BaseType {
  connections = new ReactiveMap<BaseType, ReactiveSet<WildcardTypeConnector>>();

  dispose: () => void;
  owner: any;

  constructor(public wildcard: Wildcard) {
    super();

    const { owner, dispose } = createRoot((dispose) => {
      return { owner: getOwner(), dispose };
    });

    this.owner = owner;
    this.dispose = dispose;

    wildcard.types.add(this);

    runWithOwner(owner, () => {
      createEffect(() => {
        for (const connectionSet of this.connections.values()) {
          for (const connection of connectionSet) {
            const connectionType = createMemo<Option<[BaseType, BaseType]>>(
              (prev) => {
                if (connection instanceof WildcardType) {
                  const thisWildcardValue = this.wildcard.value();
                  const connectionWildcardValue = connection.wildcard.value();

                  if (
                    prev?.isSome() &&
                    prev.unwrap()[0] === thisWildcardValue &&
                    prev.unwrap()[1] === connectionWildcardValue
                  ) {
                    return prev;
                  }

                  return this.wildcard.value().zip(connection.wildcard.value());
                }

                return None;
              }
            );

            createEffect(() => {
              const connType = connectionType();

              connType.map(([t1, t2]) => {
                connectWildcardsInTypes(t1, t2);

                onCleanup(() => {
                  disconnectWildcardsInTypes(t1, t2);
                });
              });

              return connType;
            });
          }
        }
      });

      onCleanup(() => {
        this.wildcard.types.delete(this);
      });
    });
  }

  addConnection(type: BaseType, connection: WildcardTypeConnector) {
    const connections =
      this.connections.get(type) ??
      (() => {
        const v = new ReactiveSet<WildcardTypeConnector>();
        this.connections.set(type, v);
        return v;
      })();

    connections.add(connection);
  }

  removeConnection(type: BaseType, connection: WildcardTypeConnector) {
    const connections = this.connections.get(type);

    if (!connections) return;

    connections.delete(connection);
  }
}

class WildcardTypeConnector {
  constructor(public a: BaseType, public b: BaseType) {}
}

class Wildcard {
  types = new ReactiveSet<WildcardType>();

  value: Accessor<Option<BaseType>>;
  private setRawValue: Setter<Option<BaseType>>;

  dispose: () => void;

  constructor() {
    const { dispose, value, setValue, owner } = createRoot((dispose) => {
      const [value, setValue] = createSignal<Option<BaseType>>(None);

      return { dispose, value, setValue, owner: getOwner() };
    });

    this.dispose = dispose;
    this.value = value;
    this.setRawValue = setValue;

    runWithOwner(owner, () => {
      createEffect(() => this.calculateValue());
    });
  }

  private setValue(value: Option<BaseType>) {
    this.setRawValue((old) => {
      if (old.eq(value)) return old;
      return value;
    });
  }

  calculateValue() {
    const surroundingValues = (() => {
      let arr: BaseType[] = [];

      for (const type of this.types) {
        for (const connections of type.connections.values()) {
          for (const connection of connections) {
            arr.push(connection.a === type ? connection.b : connection.a);
          }
        }
      }

      return arr;
    })();

    if (
      untrack(() =>
        this.value()
          .map((v) => !!surroundingValues.find((sv) => sv === v))
          .unwrapOr(false)
      )
    )
      return;

    const [firstValue] = surroundingValues;

    if (firstValue === undefined) {
      this.setValue(None);
      return;
    }

    const nonWildcardType = surroundingValues.find(
      (t) => !(t instanceof WildcardType)
    );

    if (nonWildcardType) {
      this.setValue(Some(nonWildcardType));
      return;
    }

    const selectedValue = firstValue as WildcardType;

    createEffect(() => {
      this.setValue(selectedValue.wildcard.value());
    });
  }
}

function connectWildcardsInTypes(aRaw: BaseType, bRaw: BaseType) {
  let a = aRaw;
  let b = bRaw;

  let connection: WildcardTypeConnector | undefined;

  if (aRaw instanceof WildcardType || bRaw instanceof WildcardType) {
    connection = new WildcardTypeConnector(aRaw, bRaw);

    if (aRaw instanceof WildcardType) {
      aRaw.addConnection(bRaw, connection);
      a = aRaw.wildcard.value().unwrapOr(aRaw);
    }
    if (bRaw instanceof WildcardType) {
      bRaw.addConnection(aRaw, connection);
      b = bRaw.wildcard.value().unwrapOr(bRaw);
    }
  }

  if (a instanceof MapType && b instanceof MapType)
    connectWildcardsInTypes(a.value, b.value);
  else if (a instanceof ListType && b instanceof ListType)
    connectWildcardsInTypes(a.item, b.item);
  else if (a instanceof OptionType && b instanceof OptionType)
    connectWildcardsInTypes(a.inner, b.inner);

  return connection;
}

function disconnectWildcardsInTypes(aRaw: BaseType, bRaw: BaseType) {
  let a = aRaw;
  let b = bRaw;

  if (aRaw instanceof WildcardType) a = aRaw.wildcard.value().unwrapOr(aRaw);
  if (bRaw instanceof WildcardType) b = bRaw.wildcard.value().unwrapOr(bRaw);
  if (a instanceof MapType && b instanceof MapType) {
    disconnectWildcardsInTypes(a.value, b.value);
  } else if (a instanceof ListType && b instanceof ListType)
    disconnectWildcardsInTypes(a.item, b.item);
  else if (a instanceof OptionType && b instanceof OptionType)
    disconnectWildcardsInTypes(a.inner, b.inner);

  if (aRaw instanceof WildcardType) aRaw.removeConnection(bRaw);
  if (bRaw instanceof WildcardType) bRaw.removeConnection(aRaw);
}

test("Connect String + Wildcard", () => {
  // Node 1
  const output = new StringType();

  // Node 2
  const wildcard = new Wildcard();
  const input = new WildcardType(wildcard);

  connectWildcardsInTypes(output, input);

  expect(wildcard.value().expect("No wildcard value!")).toBe(output);
});

test("Connect String + Wildcard + Wildcard", () => {
  // Node 1
  const output1 = new StringType();

  // Node 2
  const wildcard2 = new Wildcard();
  const input2 = new WildcardType(wildcard2);

  connectWildcardsInTypes(output1, input2);

  expect(wildcard2.value().unwrap()).toBe(output1);

  const output2 = new WildcardType(wildcard2);

  // Node 3
  const wildcard3 = new Wildcard();
  const input3 = new WildcardType(wildcard3);

  expect(wildcard3.value().isNone()).toBe(true);

  connectWildcardsInTypes(output2, input3);

  expect(wildcard3.value().unwrap()).toBe(output1);
});

test("Connect Map<String> + Map<Wildcard>", () => {
  // Node 1
  const output = new MapType(new StringType());

  // Node 2
  const wildcard = new Wildcard();
  const input = new MapType(new WildcardType(wildcard));

  expect(wildcard.value().isNone()).toBe(true);

  connectWildcardsInTypes(output, input);

  expect(wildcard.value().unwrap()).toBe(output.value);
});

describe("Connect Map<String> + Map<Wildcard> + Map<Wildcard>", () => {
  function setup() {
    // Node 1
    const output1 = new MapType(new StringType());

    // Node 2
    const wildcard2 = new Wildcard();
    const input2 = new MapType(new WildcardType(wildcard2));
    const output2 = new MapType(new WildcardType(wildcard2));

    // Node 3
    const wildcard3 = new Wildcard();
    const input3 = new MapType(new WildcardType(wildcard3));

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
    const output1 = new MapType(new StringType());

    // Node 2
    const wildcard2 = new Wildcard();
    const input2 = new WildcardType(wildcard2);
    const output2 = new WildcardType(wildcard2);

    // Node 3
    const wildcard3 = new Wildcard();
    const input3 = new MapType(new WildcardType(wildcard3));

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

  test.only("Disconnect Backwards", () => {
    const { output1, wildcard2, input2, output2, wildcard3, input3 } = setup();

    connectWildcardsInTypes(output2, input3);
    connectWildcardsInTypes(output1, input2);

    expect(wildcard3.value().unwrap()).toBe(output1.value);
    expect(input3).toBe(wildcard2.value().unwrap());

    disconnectWildcardsInTypes(output2, input3);

    console.log(output2.wildcard.value());

    // console.log(
    //   [...wildcard3.types()[0]].flatMap((t) => [...t.connections()[0]])
    // );

    // expect(wildcard2.value().unwrap()).toBe(input3);
    // expect(wildcard3.value()).toBe(None);

    // disconnectWildcardsInTypes(output1, input2);
  });
});

// describe("connecting two types", () => {
//   test("T", async () => {
//     const wildcard = new Wildcard();

//     const type1 = new WildcardType(wildcard);
//     const type2 = new StringType();

//     connectWildcardsInTypes(type1, type2);

//     expect(type1.wildcard.value().unwrap()).toBe(type2);
//   });
//   test("List<T>", () => {
//     const wildcard = new Wildcard();

//     const type1 = new ListType(new WildcardType(wildcard));
//     const type2 = new ListType(new StringType());

//     connectWildcardsInTypes(type1, type2);

//     expect(type1.item.wildcard.value().unwrap()).toBe(type2.item);
//   });
//   test("Option<T>", () => {
//     const wildcard = new Wildcard();

//     const type1 = new OptionType(new WildcardType(wildcard));
//     const type2 = new OptionType(new StringType());

//     connectWildcardsInTypes(type1, type2);

//     expect(type1.inner.wildcard.value().unwrap()).toBe(type2.inner);
//   });
//   test("Option<List<T>>", () => {
//     const wildcard = new Wildcard();

//     const type1 = new OptionType(new ListType(new WildcardType(wildcard)));
//     const type2 = new OptionType(new ListType(new StringType()));

//     connectWildcardsInTypes(type1, type2);

//     expect(type1.inner.item.wildcard.value().unwrap()).toBe(type2.inner.item);
//   });
// });

// describe("connecting two groups", () => {
//   test("T", () => {
//     const wildcard1 = new Wildcard();
//     const wildcard1Out = new WildcardType(wildcard1);

//     const wildcard2 = new Wildcard();
//     const wildcard2In = new WildcardType(wildcard2);
//     const wildcard2Out = new WildcardType(wildcard2);

//     const bool = new StringType();

//     connectWildcardsInTypes(wildcard1Out, wildcard2In);
//     connectWildcardsInTypes(wildcard2Out, bool);

//     expect(wildcard2.value().unwrap()).toBe(bool);
//     expect(wildcard1.value().unwrap()).toBe(bool);
//   });
// });
