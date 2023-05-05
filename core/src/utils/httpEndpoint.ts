type Endpoint = ReturnType<typeof createEndpoint>;
type HTTPMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface EndpointArgs {
  path: string;
  extend?: Endpoint;
  fetchFn?: typeof fetch;
}

export function createEndpoint({ path, extend, fetchFn }: EndpointArgs) {
  if (extend) path = `${extend.path}${path}`;

  const resolvedFetchFn: typeof fetch = fetchFn ?? extend?.fetchFn ?? fetch;

  const createFetcher = (method: HTTPMethod) => (args?: { body?: string }) => {
    return resolvedFetchFn(path, {
      method,
      ...args,
    });
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
