import { z } from "zod";

export type Endpoint = ReturnType<typeof createEndpoint>;

interface EndpointArgs {
  path: string;
  extend?: Endpoint;
  fetch(...args: Parameters<typeof fetch>): any;
}

export function createEndpoint({ path, extend, fetch }: EndpointArgs) {
  if (extend) path = `${extend.path}${path}`;

  const createFetcher =
    (method: string) =>
    async <TSchema extends z.ZodType>(
      schema: TSchema,
      args?: Omit<RequestInit, "method">
    ): Promise<z.infer<TSchema>> => {
      return schema.parse(
        await fetch(path, {
          method,
          ...args,
        })
      );
    };

  return {
    path,
    fetch,
    extend(path: string) {
      return createEndpoint({
        path,
        extend: this,
        fetch,
      });
    },
    get: createFetcher("GET"),
    post: createFetcher("POST"),
    put: createFetcher("PUT"),
    patch: createFetcher("PATCH"),
    delete: createFetcher("DELETE"),
  };
}

export function createHTTPClient<TReqs extends RESTDefinitions, TCtx>(args: {
  root: string;
  fetch: (ctx: TCtx, ...args: Parameters<typeof fetch>) => Promise<any>;
}) {
  return {
    call<TPath extends keyof TReqs>(
      restPath: TPath,
      ctx: TCtx,
      init?: Omit<RequestInit, "method">
    ) {
      const [method, path] = splitRESTPath(restPath as any);
      return args.fetch(ctx, `${args.root}${path}`, {
        method,
        ...init,
      });
    },
  };
}

type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH";
type RESTPath = `${HTTPMethod} ${string}`;
type RESTDefinitions = {
  [K: RESTPath]: any;
};

function splitRESTPath<T extends RESTPath>(restPath: T) {
  const [method, path]: [HTTPMethod, string] = restPath.split(" ") as any;
  return [method, path] as const;
}
