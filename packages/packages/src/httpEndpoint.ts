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
