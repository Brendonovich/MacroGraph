import { z } from "zod";

export type Endpoint = ReturnType<typeof createEndpoint>;

interface EndpointArgs {
  path: string;
  extend?: Endpoint;
  fetch: typeof fetch;
}

export function createEndpoint({ path, extend, fetch }: EndpointArgs) {
  if (extend) path = `${extend.path}${path}`;

  const createFetcher =
    (method: string) =>
    async <TSchema extends z.ZodType>(
      schema: TSchema,
      args?: Omit<RequestInit, "method">
    ): Promise<z.infer<TSchema>> => {
      const res = await fetch(path, {
        method,
        ...args,
      });

      return schema.parse(await res.json());
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
