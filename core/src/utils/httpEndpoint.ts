import { z } from "zod";
import { rspcClient } from "../client";
import { HTTPBody, HTTPRequest } from "../core";

type Endpoint = ReturnType<typeof createEndpoint>;
type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export const nativeFetch = (req: HTTPRequest) =>
  rspcClient.query(["http.json", req]).then((d) => d.data);

interface EndpointArgs {
  path: string;
  extend?: Endpoint;
  fetchFn?: (req: HTTPRequest) => any;
}

export function createEndpoint({ path, extend, fetchFn }: EndpointArgs) {
  if (extend) path = `${extend.path}${path}`;

  const resolvedFetchFn: (req: HTTPRequest) => Promise<any> =
    fetchFn ?? extend?.fetchFn ?? nativeFetch;

  const createFetcher =
    (method: HTTPMethod) =>
    async <TSchema extends z.ZodType>(
      schema: TSchema,
      args?: { body?: HTTPBody }
    ): Promise<z.infer<TSchema>> => {
      const res = await resolvedFetchFn({
        url: path,
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
