type Endpoint = ReturnType<typeof createEndpoint>;
type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface EndpointArgs {
  path: string;
  extend?: Endpoint;
  fetchFn?: typeof fetch;
}

export function createEndpoint({
  path,
  extend,
  fetchFn: customFetch = fetch,
}: EndpointArgs) {
  if (extend) path = `${extend.path}{path}`;

  const createFetcher = (method: HTTPMethod) => (args?: { body?: string }) =>
    customFetch(path, {
      method,
      ...args,
    });

  return {
    path,
    get: createFetcher("GET"),
    post: createFetcher("POST"),
    put: createFetcher("PUT"),
    patch: createFetcher("PATCH"),
    delete: createFetcher("DELETE"),
  };
}
