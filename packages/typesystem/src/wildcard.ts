import {
  Accessor,
  createEffect,
  createMemo,
  createRoot,
  createUniqueId,
  getOwner,
  on,
  onCleanup,
  runWithOwner,
} from "solid-js";
import { ReactiveSet } from "@solid-primitives/set";

import { BaseType } from "./base";
import { None, Option, Some } from "./option";
import { t, TypeVariant } from ".";
import { createMutable } from "solid-js/store";
import { createOptionMemo, createOptionSignal, Disposable } from "./utils";

/**
 * A Wildcard that belongs to a Node.
 */
export class Wildcard {
  types = new ReactiveSet<WildcardType>();
  dispose: () => void;

  value!: Accessor<Option<t.Any>>;

  directSourceConnections!: Accessor<Set<t.Any>>;
  wildcardConnections!: Accessor<Set<t.Wildcard>>;
  directSourceConnection!: Accessor<Option<WildcardValueConnection>>;
  wildcardConnection!: Accessor<Option<WildcardValueConnection>>;

  constructor(public id: string) {
    const { dispose, owner } = createRoot((dispose) => ({
      dispose,
      owner: getOwner(),
    }));

    this.dispose = dispose;

    const self = createMutable(this);

    runWithOwner(owner, () => {
      this.directSourceConnections = createMemo(() => {
        const ret = new Set<t.Any>();

        for (const type of self.types) {
          for (const conn of type.directSourceConnections) {
            ret.add(conn);
          }
        }

        return ret;
      });

      this.wildcardConnections = createMemo(() => {
        const ret = new Set<t.Wildcard>();

        for (const type of this.types) {
          for (const w of type.wildcardConnections) {
            ret.add(w);
            w.wildcard.value();
          }
        }

        return ret;
      });

      this.directSourceConnection = createOptionMemo<WildcardValueConnection>(
        (prev) => {
          const connections = this.directSourceConnections();

          if (prev.isSome() && connections.has(prev.value.parent)) {
            return prev;
          }

          const value = connections.values().next();
          if (!value.done)
            return Some(
              new WildcardValueConnection(value.value, () => value.value)
            );

          return None;
        }
      );

      createEffect<Option<WildcardValueConnection>>((prev) => {
        const current = this.directSourceConnection();

        if (prev.isSome()) prev.unwrap().dispose();

        return current;
      }, None);

      const [wildcardConnection, setWildcardConnection] =
        createOptionSignal<WildcardValueConnection>(None);

      // reset connection state when connection disposed externally
      createEffect(() => {
        const conn = wildcardConnection();

        conn.peek((c) => {
          c.addDisposeListener(() => setWildcardConnection(None));
        });
      });

      createEffect(
        on(
          () => {
            return [
              this.directSourceConnection(),
              this.wildcardConnections(),
            ] as const;
          },
          ([directSourceConnection, wildcardConnections]) => {
            if (
              directSourceConnection.isSome() ||
              wildcardConnections.size === 0
            ) {
              setWildcardConnection(None);
              return;
            }

            if (wildcardConnection().isSome()) {
              if (
                wildcardConnections.has(
                  wildcardConnection().unwrap().parent as any
                )
              )
                return;
              else wildcardConnection().unwrap().dispose();
            }

            let connections: Option<
              [WildcardValueConnection, WildcardValueConnection]
            > = None;

            for (const conn of wildcardConnections) {
              const directConnection = conn.wildcard.directSourceConnection();

              if (directConnection.isSome()) {
                const parentValueConnection = directConnection.unwrap();

                const valueConnection = new WildcardValueConnection(
                  conn,
                  parentValueConnection.value
                );

                connections = Some([parentValueConnection, valueConnection]);
                break;
              }

              const wildcardConnection = conn.wildcard.wildcardConnection();

              if (wildcardConnection.isSome()) {
                const parentValueConnection = wildcardConnection.unwrap();

                const valueConnection = new WildcardValueConnection(conn, () =>
                  parentValueConnection.value()
                );

                connections = Some([parentValueConnection, valueConnection]);
                break;
              }
            }

            if (connections.isSome()) {
              const [parentValueConnection, valueConnection] =
                connections.unwrap();

              const unsub = parentValueConnection.addDisposeListener(() => {
                valueConnection.dispose();
              });

              valueConnection.addDisposeListener(() => {
                unsub();
                setWildcardConnection(None);
              });

              setWildcardConnection(Some(valueConnection));
            } else setWildcardConnection(None);
          }
        )
      );

      this.wildcardConnection = () => wildcardConnection();

      this.value = createOptionMemo(() => {
        const direct = this.directSourceConnection();
        const indirect = this.wildcardConnection();

        return direct.map((d) => d.value()).or(indirect.map((w) => w.value()));
      });
    });

    return self;
  }
}

class WildcardValueConnection extends Disposable {
  id = createUniqueId();

  constructor(public parent: t.Any, public value: Accessor<t.Any>) {
    super();
  }
}

/**
 * A type that is linked to a Wildcard.
 * May be owned by an AnyType or data IO.
 */
export class WildcardType extends BaseType<unknown> {
  id = createUniqueId();

  directSourceConnections = new ReactiveSet<t.Any>();
  wildcardConnections = new ReactiveSet<WildcardType>();

  dispose: () => void;

  constructor(public wildcard: Wildcard) {
    super();

    const { owner, dispose } = createRoot((dispose) => ({
      owner: getOwner(),
      dispose,
    }));

    this.dispose = dispose;

    wildcard.types.add(this);

    runWithOwner(owner, () => {
      onCleanup(() => {
        wildcard.types.delete(this);
      });
    });
  }

  default(): Option<unknown> {
    return this.wildcard
      .value()
      .map((v) => v.default())
      .expect("Cannot get default of unconnected wildcard!");
  }

  variant(): TypeVariant {
    return this.wildcard
      .value()
      .map((v) => v.variant())
      .unwrapOr("wildcard");
  }

  toString(): string {
    return this.wildcard
      .value()
      .map((v) => `Wildcard(${v.toString()})`)
      .unwrapOr("Wildcard");
  }

  // asZodType(): z.ZodType {
  //   return this.wildcard
  //     .value()
  //     .map((v) => v.asZodType())
  //     .unwrapOrElse(() => z.any());
  // }

  getWildcards(): Wildcard[] {
    return this.wildcard
      .value()
      .map((v) => v.getWildcards())
      .unwrapOrElse(() => [this.wildcard]);
  }

  eq(other: t.Any) {
    return other instanceof t.Wildcard && other.wildcard === this.wildcard;
  }

  serialize() {
    throw new Error("Wildcard cannot be serialized!");
  }
}

export function connectWildcardsInTypes(a: t.Any, b: t.Any) {
  if (a === b) return;

  if (a instanceof t.Wildcard || b instanceof t.Wildcard) {
    if (!(a instanceof t.Wildcard) && b instanceof t.Wildcard) {
      b.directSourceConnections.add(a);
    } else if (a instanceof t.Wildcard && !(b instanceof t.Wildcard)) {
      a.directSourceConnections.add(b);
    } else if (a instanceof t.Wildcard && b instanceof t.Wildcard) {
      a.wildcardConnections.add(b);
      b.wildcardConnections.add(a);
    }
  } else if (a instanceof t.Map && b instanceof t.Map)
    connectWildcardsInTypes(a.value, b.value);
  else if (a instanceof t.List && b instanceof t.List)
    connectWildcardsInTypes(a.item, b.item);
  else if (a instanceof t.Option && b instanceof t.Option) {
    connectWildcardsInTypes(a.inner, b.inner);
  }
}

export function disconnectWildcardsInTypes(a: t.Any, b: t.Any) {
  if (a instanceof t.Wildcard || b instanceof t.Wildcard) {
    if (!(a instanceof t.Wildcard) && b instanceof t.Wildcard)
      b.directSourceConnections.delete(a);
    else if (a instanceof t.Wildcard && !(b instanceof t.Wildcard))
      a.directSourceConnections.delete(b);
    else if (a instanceof t.Wildcard && b instanceof t.Wildcard) {
      a.wildcardConnections.delete(b);
      b.wildcardConnections.delete(a);
    }
  } else if (a instanceof t.Map && b instanceof t.Map) {
    disconnectWildcardsInTypes(a.value, b.value);
  } else if (a instanceof t.List && b instanceof t.List)
    disconnectWildcardsInTypes(a.item, b.item);
  else if (a instanceof t.Option && b instanceof t.Option)
    disconnectWildcardsInTypes(a.inner, b.inner);
}
