export function createHTTPClient<TReqs extends RESTDefinitions, TCtx>(args: {
  root: string;
  fetch: (ctx: TCtx, ...args: Parameters<typeof fetch>) => Promise<any>;
}) {
  return {
    call<TPath extends keyof TReqs>(
      restPath: TPath,
      ctx: TCtx,
      init?: Omit<RequestInit, "method">
    ): Promise<TReqs[TPath]> {
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
