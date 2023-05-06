import { z } from "zod";

type Endpoint = ReturnType<typeof createEndpoint>;
type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface EndpointArgs {
  path: string;
  extend?: Endpoint;
  fetchFn?: (url: string, args?: RequestInit) => any;
}

export function createEndpoint({ path, extend, fetchFn }: EndpointArgs) {
  if (extend) path = `${extend.path}${path}`;

  const resolvedFetchFn: (url: string, args?: RequestInit) => Promise<any> =
    fetchFn ?? extend?.fetchFn ?? fetch;

  const createFetcher =
    (method: HTTPMethod) =>
    async <TSchema extends z.ZodType>(
      schema: TSchema,
      args?: { body?: string }
    ): Promise<z.infer<TSchema>> => {
      const res = resolvedFetchFn(path, {
        method,
        ...args,
      });

      return schema.parse(res);
    };

  return {
    path,
    fetchFn: resolvedFetchFn,
    get: createFetcher("GET"),
    post: createFetcher("POST"),
    put: createFetcher("PUT"),
    patch: createFetcher("PATCH"),
    delete: createFetcher("DELETE"),
  };
}
