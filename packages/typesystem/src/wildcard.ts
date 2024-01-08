import {
  Accessor,
  batch,
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
import { ReactiveMap } from "@solid-primitives/map";

/**
 * A Wildcard that belongs to a Node.
 */
export class Wildcard {
  types = new ReactiveSet<WildcardType>();
  dispose: () => void;

  valueConnection!: Accessor<Option<WildcardValueConnection>>;

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

        for (const type of this.types) {
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
            w.wildcard.valueConnection();
          }
        }

        return ret;
      });

      this.directSourceConnection = createOptionMemo<WildcardValueConnection>(
        () => {
          const connections = this.directSourceConnections();

          let maybeConnection: t.Any | undefined;

          for (const connection of connections) {
            if (!maybeConnection) maybeConnection = connection;
            else if (
              maybeConnection.hasWildcard() &&
              !connection.hasWildcard()
            ) {
              maybeConnection = connection;
              break;
            }
          }

          if (maybeConnection) {
            const connection = maybeConnection;

            return Some(
              new WildcardValueConnection(connection, () => connection)
            );
          }

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

      this.valueConnection = createOptionMemo(() =>
        this.directSourceConnection().or(this.wildcardConnection())
      );
    });

    return self;
  }

  value() {
    return this.valueConnection().map((c) => c.value());
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

  connections = new ReactiveMap<t.Any, WildcardTypeConnector>();

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
      .valueConnection()
      .map((v) => v.value().default())
      .expect("Cannot get default of unconnected wildcard!");
  }

  variant(): TypeVariant {
    return this.wildcard
      .valueConnection()
      .map((v) => v.value().variant())
      .unwrapOr("wildcard");
  }

  toString(): string {
    return this.wildcard
      .valueConnection()
      .map((v) => `Wildcard(${v.value().toString()})`)
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
      .valueConnection()
      .map((v) => v.value().getWildcards())
      .unwrapOrElse(() => [this.wildcard]);
  }

  eq(other: t.Any) {
    return other instanceof t.Wildcard && other.wildcard === this.wildcard;
  }

  serialize() {
    throw new Error("Wildcard cannot be serialized!");
  }

  hasWildcard(): boolean {
    return true;
  }

  addConnection(connection: WildcardTypeConnector) {
    const opposite = connection.getOpposite(this);

    this.connections.set(opposite, connection);
  }

  removeConnection(connection: WildcardTypeConnector) {
    const opposite = connection.getOpposite(this);

    this.connections.delete(opposite);
  }
}

/**
 * In charge of propagating wildcard connections between nested wildcards.
 * Shouldn't be created manually, but rather through `connectWildcardsInTypes`.
 *
 * `Map<Wildcard> <-> Wildcard <-> Map<String>`
 *   1. `Wildcard` will connect to `Map<Wildcard>`
 *   2. `Wildcard` will connect to `Map<String>` as it conforms to `Map<Wildcard>`
 *   3. Listener will be setup for the value of `Wildcard`, when it changes:
 *       - If `Some`: `connectWildcardsInTypes` will be called for `Map<Wildcard>.inner` and `Wildcard`.
 *         Since `Wildcard` is inheriting `Map<String>`, `cWIT` will connect `Map<Wildcard>.inner` to the `Map<String>.inner` as a direct source.
 *         Additionally, a dispose listener will be setup for the value, which will call `disconnectWildcardsInTypes` in the same fashion as `cWIT`.
 * 	       Without this, `Map<Wildcard>.inner` will have no awareness of its parent connection, and will remain connceted to `Map<String>.inner`.
 *       - If `None`: Any previus listeners will be cleaned up.
 */
class WildcardTypeConnector extends Disposable {
  constructor(public a: t.Any, public b: t.Any) {
    super();

    const disposeRoot = createRoot((dispose) => {
      if (a instanceof t.Wildcard === b instanceof t.Wildcard) return dispose;

      let connection: WildcardTypeConnector | undefined;

      function connectWildcards(a: t.Any, b: t.Any) {
        if (!(a instanceof t.Wildcard)) return;

        createEffect(() => {
          // need to disconnect/reconnect each time a new value is available
          const wildcardValue = a.wildcard.valueConnection();

          wildcardValue.peek((wildcardValue) => {
            const value = wildcardValue.value();
            if (value === b) return;

            // connects stuff like `Map<Wildcard>` and `Wildcard(Map<String>)` since
            // a) `value` is the `Map<String>` from `Wildcard(Map<String>)` and
            // b) cWIT will connect their `inner` values since they're both maps
            connectWildcardsInTypes(value, b);

            const cleanup = () => disconnectWildcardsInTypes(value, b);

            // needed for if `Wildcard(Map<String>)` loses its source.
            // nested wildcard connections wouldn't disconnect with their parents without this
            const parentListener = wildcardValue.addDisposeListener(cleanup);

            // don't need a listener if we're re-running
            onCleanup(() => {
              parentListener();
              cleanup();
            });
          });
        });
      }

      connectWildcards(a, b);
      connectWildcards(b, a);

      onCleanup(() => {
        connection?.dispose();
      });

      return dispose;
    });

    if (getOwner()) onCleanup(() => this.dispose());

    this.addDisposeListener(() => {
      if (this.a instanceof t.Wildcard) this.a.removeConnection(this);
      if (this.b instanceof t.Wildcard) this.b.removeConnection(this);

      disposeRoot();
    });
  }

  getOpposite(self: t.Any) {
    return self === this.a ? this.b : this.a;
  }
}

export function connectWildcardsInTypes(a: t.Any, b: t.Any) {
  if (a === b) return;

  if (a instanceof t.Wildcard || b instanceof t.Wildcard) {
    batch(() => {
      const connection = new WildcardTypeConnector(a, b);

      if (a instanceof t.Wildcard) a.addConnection(connection);
      if (b instanceof t.Wildcard) b.addConnection(connection);

      if (!(a instanceof t.Wildcard) && b instanceof t.Wildcard)
        b.directSourceConnections.add(a);
      else if (a instanceof t.Wildcard && !(b instanceof t.Wildcard))
        a.directSourceConnections.add(b);
      else if (a instanceof t.Wildcard && b instanceof t.Wildcard) {
        a.wildcardConnections.add(b);
        b.wildcardConnections.add(a);
      }
    });
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
    batch(() => {
      let connection: WildcardTypeConnector | undefined;

      if (a instanceof t.Wildcard) connection = a.connections.get(b);
      if (b instanceof t.Wildcard) connection = b.connections.get(a);

      connection?.dispose();

      if (!(a instanceof t.Wildcard) && b instanceof t.Wildcard)
        b.directSourceConnections.delete(a);
      else if (a instanceof t.Wildcard && !(b instanceof t.Wildcard))
        a.directSourceConnections.delete(b);
      else if (a instanceof t.Wildcard && b instanceof t.Wildcard) {
        a.wildcardConnections.delete(b);
        b.wildcardConnections.delete(a);
      }
    });
  } else if (a instanceof t.Map && b instanceof t.Map) {
    disconnectWildcardsInTypes(a.value, b.value);
  } else if (a instanceof t.List && b instanceof t.List)
    disconnectWildcardsInTypes(a.item, b.item);
  else if (a instanceof t.Option && b instanceof t.Option)
    disconnectWildcardsInTypes(a.inner, b.inner);
}
