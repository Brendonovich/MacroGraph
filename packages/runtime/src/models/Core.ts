import type { contract, CREDENTIAL } from "@macrograph/api-contract";
import { Maybe, type Option } from "@macrograph/option";
import type { InitClientReturn } from "@ts-rest/core";
import { createMutable } from "solid-js/store";
import * as v from "valibot";

import { implicitConversions } from "../utils";
import { DataInput, type DataOutput, type ScopeOutput } from "./IO";
import type { Node } from "./Node";
import type { EventsMap, RunCtx } from "./NodeSchema";
import type { Package } from "./Package";
import { Project } from "./Project";
import type { Variable } from "./Variable";
import { z } from "zod";

class NodeEmit {
  listeners = new Map<Node, Set<(d: Node) => any>>();

  emit(node: Node) {
    for (const listener of this.listeners.get(node) ?? []) {
      listener(node);
    }
  }

  subscribe(node: Node, cb: (d: Node) => any) {
    if (!this.listeners.has(node)) this.listeners.set(node, new Set());
    const listeners = this.listeners.get(node)!;

    listeners?.add(cb);

    return () => {
      listeners?.delete(cb);
      if (listeners?.size === 0) this.listeners.delete(node);
    };
  }
}

export const NODE_EMIT = new NodeEmit();

export type OAuthToken = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string[];
  issued_at: number;
};

export const OAUTH_TOKEN = v.object({
  access_token: v.string(),
  refresh_token: v.string(),
  expires_in: v.number(),
  scope: v.optional(v.array(v.string()), []),
  issued_at: v.number(),
});

export type RefreshedOAuthToken = Omit<OAuthToken, "refresh_token">;

type OAuth = {
  authorize(provider: string): Promise<OAuthToken>;
  refresh(
    provider: string,
    refreshToken: string,
  ): Promise<OAuthToken | RefreshedOAuthToken>;
};

export class Core {
  project: Project = new Project({
    core: this,
  });

  packages = [] as Package[];

  eventNodeMappings = new Map<Package, Map<string, Set<Node>>>();

  fetch: typeof fetch;
  oauth: OAuth;
  api: InitClientReturn<typeof contract, any>;

  private credentials?: Array<z.infer<typeof CREDENTIAL>>;

  private fetchCredentials = async () => {
    const creds = await this.api.getCredentials();
    if (creds.status !== 200) throw new Error("Failed to get credentials");
    this.credentials = creds.body;
    return creds.body;
  };

  getCredentials = async () => {
    if (this.credentials) return this.credentials;

    return await this.fetchCredentials();
  };

  getCredential = (provider: string, id: string | number) =>
    this.getCredentials().then(async (creds) => {
      const cred = creds.find((c) => c.provider === provider && c.id === id);
      if (!cred) return null;
      if (
        cred.token.issuedAt + cred.token.expires_in * 1000 >
        Date.now() - 1000 * 60 * 60 * 5
      )
        return cred;

      return await this.refreshCredential(provider, cred.id);
    });
  refreshCredential = async (provider: string, id: string) => {
    const resp = await this.api.refreshCredential({
      params: { providerId: provider, providerUserId: id },
    });

    if (resp.status !== 200)
      throw new Error(`Failed to refresh credential ${provider}:${id}`);

    await this.fetchCredentials();

    return resp.body;
  };

  constructor(args?: {
    fetch?: typeof fetch;
    oauth?: OAuth;
    api?: InitClientReturn<typeof contract, any>;
  }) {
    this.fetch = args?.fetch ?? fetch;
    this.oauth = args?.oauth!;
    this.api = args?.api!;

    return createMutable(this);
  }

  // async bc of #402, the project's reactivity needs to be entirely decoupled from the ui
  async load(getProject: (core: Core) => Promise<Project>) {
    await new Promise<void>((res) => {
      this.eventNodeMappings.clear();
      getProject(this).then((project) => {
        this.project = project;
        this.project.disableSave = true;

        res();
      });
    });
    this.project.disableSave = false;
  }

  schema(pkg: string, name: string) {
    return this.packages.find((p) => p.name === pkg)?.schema(name);
  }

  registerPackage(packageFactory: (core: this) => Package<any>) {
    const pkg = packageFactory(this);
    pkg.core = this;
    this.packages.push(pkg);
  }

  emitEvent<TEvents extends EventsMap, TEvent extends keyof EventsMap>(
    pkg: Package<TEvents, any>,
    event: { name: TEvent; data: TEvents[TEvent] },
  ) {
    const mappings = this.eventNodeMappings
      .get(pkg as any)
      ?.get(event.name as string);

    for (const n of mappings ?? []) {
      new ExecutionContext(n).run(event.data);
    }
  }

  private printListeners = new Set<(msg: PrintItem) => void>();

  print(msg: string, node: Node) {
    for (const cb of this.printListeners) {
      cb({
        value: msg,
        timestamp: new Date(),
        graph: { name: node.graph.name, id: node.graph.id },
        node: { name: node.state.name, id: node.id },
      });
    }
  }

  printSubscribe(cb: (i: PrintItem) => void) {
    this.printListeners.add(cb);
    return () => this.printListeners.delete(cb);
  }
}

export interface PrintItem {
  value: string;
  timestamp: Date;
  graph: { name: string; id: number };
  node: { name: string; id: number };
}

export class ExecutionContext {
  data = new Map<DataOutput<any> | ScopeOutput, any>();

  constructor(public root: Node) {}

  run(data: any) {
    NODE_EMIT.emit(this.root);

    this.root.schema.run({
      ctx: this.createCtx(this.root),
      io: this.root.ioReturn,
      data,
      properties: this.root.schema.properties ?? {},
      graph: this.root.graph,
    });
  }

  createCtx(node: Node): RunCtx {
    return {
      exec: async (execOutput) => {
        await execOutput
          .connection()
          .peekAsync((conn) => this.execNode(conn.node));
      },
      execScope: async (scopeOutput, data) => {
        await scopeOutput.connection().peekAsync(async (conn) => {
          this.data.set(scopeOutput, data);

          await this.execNode(conn.node);
        });
      },
      setOutput: (output, value) => {
        this.data.set(output, value);
      },
      getInput: (input) => {
        return (
          input.connection as Option<DataOutput<any> | ScopeOutput>
        ).mapOrElse(
          () => {
            if (input instanceof DataInput)
              return input.defaultValue ?? input.type.default();
          },
          (conn) => {
            const data = this.data.get(conn);

            if (data === undefined)
              throw new Error(`Data not found for input '${input.id}'!`);

            if (input instanceof DataInput)
              return applyImplicitConversion(data, input);

            return data;
          },
        );
      },
      getProperty: (p) => node.getProperty(p) as any,
      getVariable(source, id) {
        if (source === "graph") {
          return Maybe(node.graph.variables.find((v) => v.id === id));
        }

        return Maybe(
          node.graph.core.project.variables.find((v) => v.id === id),
        );
      },
      setVariable: (source, id, value) => {
        let variable: Variable | undefined;

        if (source === "graph") {
          variable = node.graph.variables.find((v) => v.id === id);
        } else {
          variable = node.graph.core.project.variables.find((v) => v.id === id);
        }

        if (!variable) return;
        variable.value = value;
      },
    };
  }

  async execNode(node: Node) {
    if (
      "event" in node.schema ||
      ("type" in node.schema && node.schema.type === "event")
    )
      throw new Error("Cannot exec an Event node!");

    NODE_EMIT.emit(node);

    // calculate previous outputs
    await Promise.allSettled(
      node.state.inputs.map((i) => {
        if (!(i instanceof DataInput)) return;

        i.connection.peekAsync(async (conn) => {
          const connectedNode = conn.node;
          const schema = connectedNode.schema;

          if (
            ("variant" in schema && schema.variant === "Pure") ||
            ("type" in schema && schema.type === "pure")
          ) {
            // Pure nodes recalculate each time

            await this.execNode(connectedNode as any);
          } else {
            // Value should already be present for non-pure nodes

            const value = this.data.get(conn);

            if (value === undefined)
              throw new Error(
                `Data for Pin ${conn.id}, Node ${conn.node.state.name} not found!`,
              );
          }
        });
      }),
    );

    await node.schema.run({
      ctx: this.createCtx(node),
      io: node.ioReturn,
      properties: node.schema.properties ?? {},
      graph: node.graph,
    });
  }
}

function applyImplicitConversion(value: any, input: DataInput<any>) {
  const output = input.connection.toNullable();
  if (!output) return value;

  for (const conversion of Object.values(implicitConversions)) {
    if (conversion.check(output.type, input.type))
      return conversion.apply(value);
  }

  return value;
}
