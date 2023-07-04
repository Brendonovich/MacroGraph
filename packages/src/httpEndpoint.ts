import { rspcClient, HTTPRequest, HTTPMethod } from "@macrograph/core";
import { z } from "zod";
import * as core from "@macrograph/core";

type Endpoint = ReturnType<typeof createEndpoint>;

type HTTPBody = FormData | URLSearchParams | object;
type HTTPData = {
  method: HTTPMethod;
  headers?: HTTPRequest["headers"];
  body?: FormData | URLSearchParams | object;
};

export const nativeFetch = async (url: string, data: HTTPData) => {
  let body: core.HTTPBody | undefined;

  if (data.body instanceof URLSearchParams) {
    url = `${url}?${data.body.toString()}`;
  } else {
    body =
      data.body instanceof FormData
        ? {
            Form: [...data.body.entries()].reduce(
              (acc, curr) => ({
                ...acc,
                [curr[0]]: curr[1] as string,
              }),
              {} as Extract<core.HTTPBody, { Form: any }>["Form"]
            ),
          }
        : { Json: data.body };
  }

  const d = await rspcClient.query([
    "http.json",
    {
      url,
      ...data,
      body,
    },
  ]);

  return d.data;
};

interface EndpointArgs {
  path: string;
  extend?: Endpoint;
  fetchFn?: (url: string, req: HTTPData) => any;
}

export function createEndpoint({ path, extend, fetchFn }: EndpointArgs) {
  if (extend) path = `${extend.path}${path}`;

  const resolvedFetchFn: (url: string, req: HTTPData) => any =
    fetchFn ?? extend?.fetchFn ?? nativeFetch;

  const createFetcher =
    (method: HTTPMethod) =>
    async <TSchema extends z.ZodType>(
      schema: TSchema,
      args?: { body?: HTTPBody }
    ): Promise<z.infer<TSchema>> => {
      const res = await resolvedFetchFn(path, {
        method,
        ...args,
      });

      return schema.parse(res);
    };

  return {
    path,
    fetchFn: resolvedFetchFn,
    extend(path: string) {
      return createEndpoint({
        path,
        extend: this,
      });
    },
    get: createFetcher("GET"),
    post: createFetcher("POST"),
    put: createFetcher("PUT"),
    patch: createFetcher("PATCH"),
    delete: createFetcher("DELETE"),
  };
}
