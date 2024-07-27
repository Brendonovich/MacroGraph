import { Maybe, None, type Option, Some } from "@macrograph/option";
import {
  BasePrimitiveType,
  type BaseType,
  connectWildcardsInTypes,
  disconnectWildcardsInTypes,
  t,
} from "@macrograph/typesystem";
import { ReactiveSet } from "@solid-primitives/set";
import "@total-typescript/ts-reset/filter-boolean";
import {
  type Accessor,
  createEffect,
  createMemo,
  createRoot,
  getOwner,
  mapArray,
  on,
  onCleanup,
  runWithOwner,
} from "solid-js";
import { createMutable } from "solid-js/store";

import { makeIORef, splitIORef } from "./Graph";
import type { Node } from "./Node";
import type { DataOutputBuilder } from "./NodeSchema";

export function connectWildcardsInIO(
  output: DataOutput<t.Any>,
  input: DataInput<t.Any>
) {
  createMemo(
    on(
      () => {
        const outType = output.type;
        const inType = input.type;

        return { outType, inType };
      },
      ({ outType, inType }) => {
        connectWildcardsInTypes(outType, inType);

        onCleanup(() => {
          disconnectWildcardsInTypes(outType, inType);
        });
      }
    )
  );
}

export function hasConnection(
  io:
    | DataInput<any>
    | DataOutput<any>
    | ExecInput
    | ExecOutput
    | ScopeInput
    | ScopeOutput
) {
  if ("connection" in io) {
    if (typeof io.connection === "function") return io.connection().isSome();
    return io.connection.isSome();
  }
  if (typeof io.connections === "function") return io.connections().length > 0;
  return io.connections.size > 0;
}

export type DataInputArgs<T extends BaseType<any>> = {
  id: string;
  name?: string;
  type: T;
  node: Node;
  fetchSuggestions?: () => Promise<t.infer<T>[]>;
};

export class DataInput<T extends BaseType<any>> {
  id: string;
  name?: string;
  defaultValue: t.infer<T> | null = null;
  type: T;
  node: Node;
  dispose: () => void;
  fetchSuggestions?: () => Promise<string[]>;

  connection: Option<DataOutput<T>> = None;

  constructor(args: DataInputArgs<T>) {
    this.id = args.id;
    this.name = args.name;
    this.defaultValue =
      args.type instanceof BasePrimitiveType ? args.type.default() : null;
    this.node = args.node;
    this.type = args.type;
    this.fetchSuggestions = args.fetchSuggestions;

    const { owner, dispose } = createRoot((dispose) => ({
      owner: getOwner(),
      dispose,
    }));

    this.dispose = dispose;

    const self = createMutable(this);

    runWithOwner(owner, () => {
      createEffect<Option<t.Any>>((prev) => {
        const type = this.type;
        if (!(type instanceof t.Wildcard)) return None;

        const value = type.wildcard.value();

        if (value.isSome() && value.unwrap() instanceof BasePrimitiveType) {
          if (prev.isSome() && value.unwrap().eq(prev.unwrap())) return prev;

          if (self.defaultValue === null)
            self.defaultValue = value.unwrap().default();
        } else if (value.isSome()) self.defaultValue = null;

        return value;
      }, None);
    });

    return self;
  }

  setDefaultValue(value: any) {
    this.defaultValue = value;

    this.node.graph.project.save();
  }

  get variant() {
    return "Data";
  }
}

export interface DataOutputArgs<T extends BaseType<any>> {
  node: Node;
  id: string;
  name?: string;
  type: T;
}

export class DataOutput<T extends BaseType> {
  id: string;
  node: Node;
  name?: string;
  type: T;

  connections!: Accessor<ReadonlyArray<DataInput<T>>>;

  dispose: () => void;

  constructor(args: DataOutputArgs<T>) {
    this.id = args.id;
    this.node = args.node;
    this.name = args.name;
    this.type = args.type;

    const { owner, dispose } = createRoot((dispose) => ({
      owner: getOwner(),
      dispose,
    }));

    this.dispose = dispose;

    const self = createMutable(this);

    runWithOwner(owner, () => {
      this.connections = createMemo(
        () => {
          const graph = this.node.graph;

          const conns = graph.connections.get(makeIORef(this)) ?? [];

          return conns
            .map((conn) => {
              const { nodeId, ioId } = splitIORef(conn);

              const node = graph.nodes.get(nodeId);
              const input = node?.input(ioId);

              if (input instanceof DataInput) return input as DataInput<T>;
            })
            .filter(Boolean);
        },
        [],
        {
          equals: (prev, next) =>
            prev.length === next.length && prev.every((p, i) => p === next[i]),
        }
      );

      createMemo(
        mapArray(self.connections, (conn) => {
          conn.connection = Some(self as any);

          connectWildcardsInIO(self, conn);

          onCleanup(() => {
            conn.connection = None;
          });
        })
      );
    });

    return self;
  }

  get variant() {
    return "Data";
  }
}

export interface ExecInputArgs {
  node: Node;
  id: string;
  name?: string;
  connection?: Connection | null;
}

export class ExecInput {
  id: string;
  public node: Node;
  public name?: string;

  connections = new ReactiveSet<ExecOutput>();

  constructor(args: ExecInputArgs) {
    this.id = args.id;
    this.node = args.node;
    this.name = args.name;

    return createMutable(this);
  }

  get variant() {
    return "Exec";
  }
}

export interface ExecOutputArgs {
  node: Node;
  id: string;
  name?: string;
}

export class ExecOutput {
  id: string;
  public node: Node;
  public name?: string;

  connection!: Accessor<Option<ExecInput>>;

  dispose: () => void;

  constructor(args: ExecOutputArgs) {
    this.id = args.id;
    this.node = args.node;
    this.name = args.name;

    const self = createMutable(this);

    const { owner, dispose } = createRoot((dispose) => ({
      owner: getOwner(),
      dispose,
    }));

    this.dispose = dispose;

    runWithOwner(owner, () => {
      this.connection = createMemo(
        () => {
          const graph = this.node.graph;

          const ref = makeIORef(this);

          const value = Maybe(graph.connections.get(ref))
            .map(([conn]) => conn && splitIORef(conn))
            .map(({ nodeId, ioId }) => {
              const node = graph.nodes.get(nodeId);
              const input = node?.input(ioId);

              if (input instanceof ExecInput) return input;
            });

          return value;
        },
        None,
        { equals: (a, b) => a.eq(b) }
      );

      createEffect(() => {
        this.connection().peek((conn) => {
          conn.connections.add(self);

          onCleanup(() => {
            conn.connections.delete(self);
          });
        });
      });
    });

    return self;
  }

  get variant() {
    return "Exec";
  }
}

export class ScopeBuilder {
  outputs: DataOutputBuilder[] = [];

  output<T extends DataOutputBuilder>(args: T) {
    this.outputs.push(args);
  }
}

export class Scope {
  outputs: { id: string; name?: string; type: t.Any }[];

  constructor(builder: ScopeBuilder) {
    this.outputs = builder.outputs;
  }
}

export interface ScopeOutputArgs {
  node: Node;
  id: string;
  name?: string;
  scope: Scope;
}

export class ScopeOutput {
  id: string;
  node: Node;
  name?: string;
  scope: Scope;

  connection!: Accessor<Option<ScopeInput>>;

  dispose: () => void;

  constructor(args: ScopeOutputArgs) {
    this.id = args.id;
    this.node = args.node;
    this.name = args.name;
    this.scope = args.scope;

    const self = createMutable(this);

    const { owner, dispose } = createRoot((dispose) => ({
      owner: getOwner(),
      dispose,
    }));

    this.dispose = dispose;

    runWithOwner(owner, () => {
      this.connection = createMemo(() => {
        const graph = this.node.graph;

        return Maybe(graph.connections.get(makeIORef(this)))
          .map(([conn]) => conn && splitIORef(conn))
          .map(({ nodeId, ioId }) => {
            const node = graph.nodes.get(nodeId);
            const input = node?.input(ioId);

            if (input instanceof ScopeInput) return input;
          });
      });

      createEffect(() => {
        self.connection().peek((conn) => {
          conn.connection = Some(self as any);

          onCleanup(() => {
            conn.connection = None;
          });
        });
      });
    });

    return self;
  }

  get variant() {
    return "Scope";
  }
}

export interface ScopeInputArgs {
  node: Node;
  id: string;
  name?: string;
}

export class ScopeInput {
  id: string;
  node: Node;
  name?: string;

  connection: Option<ScopeOutput> = None;
  scope!: Accessor<Option<Scope>>;
  dispose: () => void;

  constructor(args: ScopeInputArgs) {
    this.id = args.id;
    this.node = args.node;
    this.name = args.name;

    const { owner, dispose } = createRoot((dispose) => ({
      owner: getOwner(),
      dispose,
    }));

    this.dispose = dispose;

    const self = createMutable(this);

    runWithOwner(owner, () => {
      this.scope = createMemo(() => {
        return self.connection.map((c) => c.scope);
      });
    });

    return self;
  }

  get variant() {
    return "Scope";
  }
}

export type ExecPin = ExecInput | ExecOutput;
export type DataPin = DataInput<any> | DataOutput<any>;
export type ScopePin = ScopeInput | ScopeOutput;
export type Pin = ExecPin | DataPin | ScopePin;

export interface Connection {
  node: number;
  io: string;
}
