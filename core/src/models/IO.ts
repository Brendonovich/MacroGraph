import { createMutable } from "solid-js/store";
import { Node } from "./Node";
import {
  t,
  Option,
  None,
  BaseType,
  PrimitiveType,
  BasePrimitiveType,
  Maybe,
  connectWildcardsInIO,
  disconnectWildcardsInIO,
  Some,
} from "../types";
import { DataOutputBuilder } from "./NodeSchema";
import {
  Accessor,
  createEffect,
  createMemo,
  createRoot,
  getOwner,
  onCleanup,
  runWithOwner,
} from "solid-js";
import { makeIORef, splitIORef } from "./Graph";

export type DataInputArgs<T extends BaseType<any>> = {
  id: string;
  name?: string;
  type: T;
  node: Node;
};

export class DataInput<T extends BaseType<any>> {
  id: string;
  name?: string;
  defaultValue: t.infer<PrimitiveType> | null = null;
  type: T;
  node: Node;
  dispose: () => void;

  connection: Option<DataOutput<T>> = None;

  constructor(args: DataInputArgs<T>) {
    this.id = args.id;
    this.name = args.name;
    this.defaultValue =
      args.type instanceof BasePrimitiveType ? args.type.default() : null;
    this.node = args.node;
    this.type = args.type;

    const { owner, dispose } = createRoot((dispose) => ({
      owner: getOwner(),
      dispose,
    }));

    this.dispose = dispose;

    const reactiveThis = createMutable(this);

    runWithOwner(owner, () => {
      createEffect<Option<t.Any>>((prev) => {
        const type = this.type;
        if (!(type instanceof t.Wildcard)) return None;

        const value = type.wildcard.value();

        if (value.isSome() && value.unwrap() instanceof BasePrimitiveType) {
          if (prev.isSome() && value.unwrap().eq(prev.unwrap())) return prev;

          if (!reactiveThis.defaultValue)
            reactiveThis.defaultValue = value.unwrap().default();
        } else reactiveThis.defaultValue = null;

        return value;
      }, None);
    });

    return reactiveThis;
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

  connections: Accessor<ReadonlyArray<DataInput<T>>>;

  constructor(args: DataOutputArgs<T>) {
    this.id = args.id;
    this.node = args.node;
    this.name = args.name;
    this.type = args.type;

    this.connections = createMemo(() => {
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
    });

    const self = createMutable(this);

    createEffect(() => {
      for (const conn of self.connections()) {
        conn.connection.replace(self);
        connectWildcardsInIO(self, conn);

        onCleanup(() => {
          conn.connection = None;
          disconnectWildcardsInIO(self, conn);
        });
      }
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

  connection: Accessor<Option<ExecOutput>>;

  constructor(args: ExecInputArgs) {
    this.id = args.id;
    this.node = args.node;
    this.name = args.name;

    this.connection = createMemo(() => {
      const graph = this.node.graph;

      return Maybe(graph.connections.get(makeIORef(this)))
        .map(([conn]) => conn && splitIORef(conn))
        .map(({ nodeId, ioId }) => {
          const node = graph.nodes.get(nodeId);
          const output = node?.output(ioId);

          if (output instanceof ExecOutput) return output;
        });
    });

    createMutable(this);
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

  connection: Accessor<Option<ExecInput>>;

  constructor(args: ExecOutputArgs) {
    this.id = args.id;
    this.node = args.node;
    this.name = args.name;

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

    createMutable(this);
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

  connection: Accessor<Option<ScopeInput>>;

  constructor(args: ScopeOutputArgs) {
    this.id = args.id;
    this.node = args.node;
    this.name = args.name;
    this.scope = args.scope;

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

    return createMutable(this);
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

  connection: Accessor<Option<ScopeOutput>>;
  scope: Accessor<Option<Scope>>;

  constructor(args: ScopeInputArgs) {
    this.id = args.id;
    this.node = args.node;
    this.name = args.name;

    this.connection = createMemo(() => {
      const graph = this.node.graph;

      return Maybe(graph.connections.get(makeIORef(this)))
        .map(([conn]) => conn && splitIORef(conn))
        .map(({ nodeId, ioId }) => {
          const node = graph.nodes.get(nodeId);
          const output = node?.output(ioId);

          if (output instanceof ScopeOutput) return output;
        });
    });

    this.scope = createMemo(() => this.connection().map((c) => c.scope));

    return createMutable(this);
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
