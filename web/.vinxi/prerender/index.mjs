globalThis._importMeta_={url:import.meta.url,env:process.env};import 'file:///Users/brendonovich/github.com/brendonovich/macrograph/node_modules/.pnpm/node-fetch-native@1.6.1/node_modules/node-fetch-native/dist/polyfill.cjs';
import { defineEventHandler, handleCacheHeaders, splitCookiesString, isEvent, createEvent, getRequestHeader, eventHandler, setHeaders, sendRedirect, proxyRequest, setResponseStatus, setResponseHeader, send, removeResponseHeader, createError, getResponseHeader, setHeader, toWebRequest, getRequestIP, appendResponseHeader, getCookie, setCookie, createApp, createRouter as createRouter$1, toNodeListener, fetchWithEvent, lazyEventHandler } from 'file:///Users/brendonovich/github.com/brendonovich/macrograph/node_modules/.pnpm/h3@1.9.0/node_modules/h3/dist/index.mjs';
import { createFetch as createFetch$1, Headers as Headers$1 } from 'file:///Users/brendonovich/github.com/brendonovich/macrograph/node_modules/.pnpm/ofetch@1.3.3/node_modules/ofetch/dist/node.mjs';
import destr from 'file:///Users/brendonovich/github.com/brendonovich/macrograph/node_modules/.pnpm/destr@2.0.2/node_modules/destr/dist/index.mjs';
import { createCall, createFetch } from 'file:///Users/brendonovich/github.com/brendonovich/macrograph/node_modules/.pnpm/unenv@1.9.0/node_modules/unenv/runtime/fetch/index.mjs';
import { createHooks } from 'file:///Users/brendonovich/github.com/brendonovich/macrograph/node_modules/.pnpm/hookable@5.5.3/node_modules/hookable/dist/index.mjs';
import { snakeCase } from 'file:///Users/brendonovich/github.com/brendonovich/macrograph/node_modules/.pnpm/scule@1.1.1/node_modules/scule/dist/index.mjs';
import { klona } from 'file:///Users/brendonovich/github.com/brendonovich/macrograph/node_modules/.pnpm/klona@2.0.6/node_modules/klona/dist/index.mjs';
import defu, { defuFn } from 'file:///Users/brendonovich/github.com/brendonovich/macrograph/node_modules/.pnpm/defu@6.1.4/node_modules/defu/dist/defu.mjs';
import { hash } from 'file:///Users/brendonovich/github.com/brendonovich/macrograph/node_modules/.pnpm/ohash@1.1.3/node_modules/ohash/dist/index.mjs';
import { parseURL, withoutBase, joinURL, getQuery, withQuery, decodePath, withLeadingSlash, withoutTrailingSlash } from 'file:///Users/brendonovich/github.com/brendonovich/macrograph/node_modules/.pnpm/ufo@1.3.2/node_modules/ufo/dist/index.mjs';
import { createStorage, prefixStorage } from 'file:///Users/brendonovich/github.com/brendonovich/macrograph/node_modules/.pnpm/unstorage@1.10.1/node_modules/unstorage/dist/index.mjs';
import unstorage_47drivers_47fs from 'file:///Users/brendonovich/github.com/brendonovich/macrograph/node_modules/.pnpm/unstorage@1.10.1/node_modules/unstorage/drivers/fs.mjs';
import unstorage_47drivers_47fs_45lite from 'file:///Users/brendonovich/github.com/brendonovich/macrograph/node_modules/.pnpm/unstorage@1.10.1/node_modules/unstorage/drivers/fs-lite.mjs';
import { toRouteMatcher, createRouter } from 'file:///Users/brendonovich/github.com/brendonovich/macrograph/node_modules/.pnpm/radix3@1.1.0/node_modules/radix3/dist/index.mjs';
import _brHrLZW5og from 'file:///Users/brendonovich/github.com/brendonovich/macrograph/node_modules/.pnpm/vinxi@0.1.1_preact@10.19.3_rollup@2.79.1/node_modules/vinxi/lib/app-fetch.js';
import _QhiIHXyToZ from 'file:///Users/brendonovich/github.com/brendonovich/macrograph/node_modules/.pnpm/vinxi@0.1.1_preact@10.19.3_rollup@2.79.1/node_modules/vinxi/lib/app-manifest.js';
import { promises } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'file:///Users/brendonovich/github.com/brendonovich/macrograph/node_modules/.pnpm/pathe@1.1.1/node_modules/pathe/dist/index.mjs';
import { sharedConfig, createContext, Suspense, ErrorBoundary, onCleanup, createUniqueId, useContext, createRenderEffect, createSignal, lazy, createComponent as createComponent$1, children, createMemo, on as on$1, createRoot, Show, getOwner, runWithOwner, untrack, startTransition, resetErrorBoundaries } from 'file:///Users/brendonovich/github.com/brendonovich/macrograph/node_modules/.pnpm/solid-js@1.8.8/node_modules/solid-js/dist/server.js';
import { provideRequestEvent } from 'file:///Users/brendonovich/github.com/brendonovich/macrograph/node_modules/.pnpm/solid-js@1.8.8/node_modules/solid-js/web/dist/storage.js';
import { ssr, createComponent, ssrHydrationKey, NoHydration, escape, getRequestEvent, useAssets, HydrationScript, ssrAttribute, Hydration, renderToStream, isServer, ssrElement, mergeProps, spread, delegateEvents } from 'file:///Users/brendonovich/github.com/brendonovich/macrograph/node_modules/.pnpm/solid-js@1.8.8/node_modules/solid-js/web/dist/server.js';

const inlineAppConfig = {};



const appConfig$1 = defuFn(inlineAppConfig);

const _inlineRuntimeConfig = {
  "app": {
    "baseURL": "/"
  },
  "nitro": {
    "routeRules": {}
  }
};
const ENV_PREFIX = "NITRO_";
const ENV_PREFIX_ALT = _inlineRuntimeConfig.nitro.envPrefix ?? process.env.NITRO_ENV_PREFIX ?? "_";
const _sharedRuntimeConfig = _deepFreeze(
  _applyEnv(klona(_inlineRuntimeConfig))
);
function useRuntimeConfig(event) {
  if (!event) {
    return _sharedRuntimeConfig;
  }
  if (event.context.nitro.runtimeConfig) {
    return event.context.nitro.runtimeConfig;
  }
  const runtimeConfig = klona(_inlineRuntimeConfig);
  _applyEnv(runtimeConfig);
  event.context.nitro.runtimeConfig = runtimeConfig;
  return runtimeConfig;
}
_deepFreeze(klona(appConfig$1));
function _getEnv(key) {
  const envKey = snakeCase(key).toUpperCase();
  return destr(
    process.env[ENV_PREFIX + envKey] ?? process.env[ENV_PREFIX_ALT + envKey]
  );
}
function _isObject(input) {
  return typeof input === "object" && !Array.isArray(input);
}
function _applyEnv(obj, parentKey = "") {
  for (const key in obj) {
    const subKey = parentKey ? `${parentKey}_${key}` : key;
    const envValue = _getEnv(subKey);
    if (_isObject(obj[key])) {
      if (_isObject(envValue)) {
        obj[key] = { ...obj[key], ...envValue };
      }
      _applyEnv(obj[key], subKey);
    } else {
      obj[key] = envValue ?? obj[key];
    }
  }
  return obj;
}
function _deepFreeze(object) {
  const propNames = Object.getOwnPropertyNames(object);
  for (const name of propNames) {
    const value = object[name];
    if (value && typeof value === "object") {
      _deepFreeze(value);
    }
  }
  return Object.freeze(object);
}
new Proxy(/* @__PURE__ */ Object.create(null), {
  get: (_, prop) => {
    console.warn(
      "Please use `useRuntimeConfig()` instead of accessing config directly."
    );
    const runtimeConfig = useRuntimeConfig();
    if (prop in runtimeConfig) {
      return runtimeConfig[prop];
    }
    return void 0;
  }
});

const serverAssets = [{"baseName":"server","dir":"/Users/brendonovich/github.com/brendonovich/macrograph/web-solid/assets"}];

const assets$1 = createStorage();

for (const asset of serverAssets) {
  assets$1.mount(asset.baseName, unstorage_47drivers_47fs({ base: asset.dir }));
}

const storage = createStorage({});

storage.mount('/assets', assets$1);

storage.mount('data', unstorage_47drivers_47fs_45lite({"driver":"fsLite","base":"/Users/brendonovich/github.com/brendonovich/macrograph/web-solid/.data/kv"}));
storage.mount('root', unstorage_47drivers_47fs({"driver":"fs","readOnly":true,"base":"/Users/brendonovich/github.com/brendonovich/macrograph/web-solid","ignore":["**/node_modules/**","**/.git/**"]}));
storage.mount('src', unstorage_47drivers_47fs({"driver":"fs","readOnly":true,"base":"/Users/brendonovich/github.com/brendonovich/macrograph/web-solid","ignore":["**/node_modules/**","**/.git/**"]}));
storage.mount('build', unstorage_47drivers_47fs({"driver":"fs","readOnly":false,"base":"/Users/brendonovich/github.com/brendonovich/macrograph/web-solid/.vinxi","ignore":["**/node_modules/**","**/.git/**"]}));
storage.mount('cache', unstorage_47drivers_47fs({"driver":"fs","readOnly":false,"base":"/Users/brendonovich/github.com/brendonovich/macrograph/web-solid/.vinxi/cache","ignore":["**/node_modules/**","**/.git/**"]}));

function useStorage(base = "") {
  return base ? prefixStorage(storage, base) : storage;
}

const defaultCacheOptions = {
  name: "_",
  base: "/cache",
  swr: true,
  maxAge: 1
};
function defineCachedFunction(fn, opts = {}) {
  opts = { ...defaultCacheOptions, ...opts };
  const pending = {};
  const group = opts.group || "nitro/functions";
  const name = opts.name || fn.name || "_";
  const integrity = opts.integrity || hash([fn, opts]);
  const validate = opts.validate || ((entry) => entry.value !== void 0);
  async function get(key, resolver, shouldInvalidateCache, event) {
    const cacheKey = [opts.base, group, name, key + ".json"].filter(Boolean).join(":").replace(/:\/$/, ":index");
    const entry = await useStorage().getItem(cacheKey) || {};
    const ttl = (opts.maxAge ?? opts.maxAge ?? 0) * 1e3;
    if (ttl) {
      entry.expires = Date.now() + ttl;
    }
    const expired = shouldInvalidateCache || entry.integrity !== integrity || ttl && Date.now() - (entry.mtime || 0) > ttl || validate(entry) === false;
    const _resolve = async () => {
      const isPending = pending[key];
      if (!isPending) {
        if (entry.value !== void 0 && (opts.staleMaxAge || 0) >= 0 && opts.swr === false) {
          entry.value = void 0;
          entry.integrity = void 0;
          entry.mtime = void 0;
          entry.expires = void 0;
        }
        pending[key] = Promise.resolve(resolver());
      }
      try {
        entry.value = await pending[key];
      } catch (error) {
        if (!isPending) {
          delete pending[key];
        }
        throw error;
      }
      if (!isPending) {
        entry.mtime = Date.now();
        entry.integrity = integrity;
        delete pending[key];
        if (validate(entry) !== false) {
          const promise = useStorage().setItem(cacheKey, entry).catch((error) => {
            console.error(`[nitro] [cache] Cache write error.`, error);
            useNitroApp().captureError(error, { event, tags: ["cache"] });
          });
          if (event && event.waitUntil) {
            event.waitUntil(promise);
          }
        }
      }
    };
    const _resolvePromise = expired ? _resolve() : Promise.resolve();
    if (entry.value === void 0) {
      await _resolvePromise;
    } else if (expired && event && event.waitUntil) {
      event.waitUntil(_resolvePromise);
    }
    if (opts.swr && validate(entry) !== false) {
      _resolvePromise.catch((error) => {
        console.error(`[nitro] [cache] SWR handler error.`, error);
        useNitroApp().captureError(error, { event, tags: ["cache"] });
      });
      return entry;
    }
    return _resolvePromise.then(() => entry);
  }
  return async (...args) => {
    const shouldBypassCache = opts.shouldBypassCache?.(...args);
    if (shouldBypassCache) {
      return fn(...args);
    }
    const key = await (opts.getKey || getKey)(...args);
    const shouldInvalidateCache = opts.shouldInvalidateCache?.(...args);
    const entry = await get(
      key,
      () => fn(...args),
      shouldInvalidateCache,
      args[0] && isEvent(args[0]) ? args[0] : void 0
    );
    let value = entry.value;
    if (opts.transform) {
      value = await opts.transform(entry, ...args) || value;
    }
    return value;
  };
}
const cachedFunction = defineCachedFunction;
function getKey(...args) {
  return args.length > 0 ? hash(args, {}) : "";
}
function escapeKey(key) {
  return String(key).replace(/\W/g, "");
}
function defineCachedEventHandler(handler, opts = defaultCacheOptions) {
  const variableHeaderNames = (opts.varies || []).filter(Boolean).map((h) => h.toLowerCase()).sort();
  const _opts = {
    ...opts,
    getKey: async (event) => {
      const customKey = await opts.getKey?.(event);
      if (customKey) {
        return escapeKey(customKey);
      }
      const _path = event.node.req.originalUrl || event.node.req.url || event.path;
      const _pathname = escapeKey(decodeURI(parseURL(_path).pathname)).slice(0, 16) || "index";
      const _hashedPath = `${_pathname}.${hash(_path)}`;
      const _headers = variableHeaderNames.map((header) => [header, event.node.req.headers[header]]).map(([name, value]) => `${escapeKey(name)}.${hash(value)}`);
      return [_hashedPath, ..._headers].join(":");
    },
    validate: (entry) => {
      if (!entry.value) {
        return false;
      }
      if (entry.value.code >= 400) {
        return false;
      }
      if (entry.value.body === void 0) {
        return false;
      }
      if (entry.value.headers.etag === "undefined" || entry.value.headers["last-modified"] === "undefined") {
        return false;
      }
      return true;
    },
    group: opts.group || "nitro/handlers",
    integrity: opts.integrity || hash([handler, opts])
  };
  const _cachedHandler = cachedFunction(
    async (incomingEvent) => {
      const variableHeaders = {};
      for (const header of variableHeaderNames) {
        variableHeaders[header] = incomingEvent.node.req.headers[header];
      }
      const reqProxy = cloneWithProxy(incomingEvent.node.req, {
        headers: variableHeaders
      });
      const resHeaders = {};
      let _resSendBody;
      const resProxy = cloneWithProxy(incomingEvent.node.res, {
        statusCode: 200,
        writableEnded: false,
        writableFinished: false,
        headersSent: false,
        closed: false,
        getHeader(name) {
          return resHeaders[name];
        },
        setHeader(name, value) {
          resHeaders[name] = value;
          return this;
        },
        getHeaderNames() {
          return Object.keys(resHeaders);
        },
        hasHeader(name) {
          return name in resHeaders;
        },
        removeHeader(name) {
          delete resHeaders[name];
        },
        getHeaders() {
          return resHeaders;
        },
        end(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2();
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return this;
        },
        write(chunk, arg2, arg3) {
          if (typeof chunk === "string") {
            _resSendBody = chunk;
          }
          if (typeof arg2 === "function") {
            arg2();
          }
          if (typeof arg3 === "function") {
            arg3();
          }
          return this;
        },
        writeHead(statusCode, headers2) {
          this.statusCode = statusCode;
          if (headers2) {
            for (const header in headers2) {
              this.setHeader(header, headers2[header]);
            }
          }
          return this;
        }
      });
      const event = createEvent(reqProxy, resProxy);
      event.context = incomingEvent.context;
      const body = await handler(event) || _resSendBody;
      const headers = event.node.res.getHeaders();
      headers.etag = String(
        headers.Etag || headers.etag || `W/"${hash(body)}"`
      );
      headers["last-modified"] = String(
        headers["Last-Modified"] || headers["last-modified"] || (/* @__PURE__ */ new Date()).toUTCString()
      );
      const cacheControl = [];
      if (opts.swr) {
        if (opts.maxAge) {
          cacheControl.push(`s-maxage=${opts.maxAge}`);
        }
        if (opts.staleMaxAge) {
          cacheControl.push(`stale-while-revalidate=${opts.staleMaxAge}`);
        } else {
          cacheControl.push("stale-while-revalidate");
        }
      } else if (opts.maxAge) {
        cacheControl.push(`max-age=${opts.maxAge}`);
      }
      if (cacheControl.length > 0) {
        headers["cache-control"] = cacheControl.join(", ");
      }
      const cacheEntry = {
        code: event.node.res.statusCode,
        headers,
        body
      };
      return cacheEntry;
    },
    _opts
  );
  return defineEventHandler(async (event) => {
    if (opts.headersOnly) {
      if (handleCacheHeaders(event, { maxAge: opts.maxAge })) {
        return;
      }
      return handler(event);
    }
    const response = await _cachedHandler(event);
    if (event.node.res.headersSent || event.node.res.writableEnded) {
      return response.body;
    }
    if (handleCacheHeaders(event, {
      modifiedTime: new Date(response.headers["last-modified"]),
      etag: response.headers.etag,
      maxAge: opts.maxAge
    })) {
      return;
    }
    event.node.res.statusCode = response.code;
    for (const name in response.headers) {
      const value = response.headers[name];
      if (name === "set-cookie") {
        event.node.res.appendHeader(
          name,
          splitCookiesString(value)
        );
      } else {
        event.node.res.setHeader(name, value);
      }
    }
    return response.body;
  });
}
function cloneWithProxy(obj, overrides) {
  return new Proxy(obj, {
    get(target, property, receiver) {
      if (property in overrides) {
        return overrides[property];
      }
      return Reflect.get(target, property, receiver);
    },
    set(target, property, value, receiver) {
      if (property in overrides) {
        overrides[property] = value;
        return true;
      }
      return Reflect.set(target, property, value, receiver);
    }
  });
}
const cachedEventHandler = defineCachedEventHandler;

function hasReqHeader(event, name, includes) {
  const value = getRequestHeader(event, name);
  return value && typeof value === "string" && value.toLowerCase().includes(includes);
}
function isJsonRequest(event) {
  if (hasReqHeader(event, "accept", "text/html")) {
    return false;
  }
  return hasReqHeader(event, "accept", "application/json") || hasReqHeader(event, "user-agent", "curl/") || hasReqHeader(event, "user-agent", "httpie/") || hasReqHeader(event, "sec-fetch-mode", "cors") || event.path.startsWith("/api/") || event.path.endsWith(".json");
}
function normalizeError(error) {
  const cwd = typeof process.cwd === "function" ? process.cwd() : "/";
  const stack = (error.stack || "").split("\n").splice(1).filter((line) => line.includes("at ")).map((line) => {
    const text = line.replace(cwd + "/", "./").replace("webpack:/", "").replace("file://", "").trim();
    return {
      text,
      internal: line.includes("node_modules") && !line.includes(".cache") || line.includes("internal") || line.includes("new Promise")
    };
  });
  const statusCode = error.statusCode || 500;
  const statusMessage = error.statusMessage ?? (statusCode === 404 ? "Not Found" : "");
  const message = error.message || error.toString();
  return {
    stack,
    statusCode,
    statusMessage,
    message
  };
}
function _captureError(error, type) {
  console.error(`[nitro] [${type}]`, error);
  useNitroApp().captureError(error, { tags: [type] });
}
function trapUnhandledNodeErrors() {
  process.on(
    "unhandledRejection",
    (error) => _captureError(error, "unhandledRejection")
  );
  process.on(
    "uncaughtException",
    (error) => _captureError(error, "uncaughtException")
  );
}
function joinHeaders(value) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}
function normalizeFetchResponse(response) {
  if (!response.headers.has("set-cookie")) {
    return response;
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: normalizeCookieHeaders(response.headers)
  });
}
function normalizeCookieHeader(header = "") {
  return splitCookiesString(joinHeaders(header));
}
function normalizeCookieHeaders(headers) {
  const outgoingHeaders = new Headers();
  for (const [name, header] of headers) {
    if (name === "set-cookie") {
      for (const cookie of normalizeCookieHeader(header)) {
        outgoingHeaders.append("set-cookie", cookie);
      }
    } else {
      outgoingHeaders.set(name, joinHeaders(header));
    }
  }
  return outgoingHeaders;
}

const config = useRuntimeConfig();
const _routeRulesMatcher = toRouteMatcher(
  createRouter({ routes: config.nitro.routeRules })
);
function createRouteRulesHandler(ctx) {
  return eventHandler((event) => {
    const routeRules = getRouteRules(event);
    if (routeRules.headers) {
      setHeaders(event, routeRules.headers);
    }
    if (routeRules.redirect) {
      return sendRedirect(
        event,
        routeRules.redirect.to,
        routeRules.redirect.statusCode
      );
    }
    if (routeRules.proxy) {
      let target = routeRules.proxy.to;
      if (target.endsWith("/**")) {
        let targetPath = event.path;
        const strpBase = routeRules.proxy._proxyStripBase;
        if (strpBase) {
          targetPath = withoutBase(targetPath, strpBase);
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.path.includes("?")) {
        const query = getQuery(event.path);
        target = withQuery(target, query);
      }
      return proxyRequest(event, target, {
        fetch: ctx.localFetch,
        ...routeRules.proxy
      });
    }
  });
}
function getRouteRules(event) {
  event.context._nitro = event.context._nitro || {};
  if (!event.context._nitro.routeRules) {
    event.context._nitro.routeRules = getRouteRulesForPath(
      withoutBase(event.path.split("?")[0], useRuntimeConfig().app.baseURL)
    );
  }
  return event.context._nitro.routeRules;
}
function getRouteRulesForPath(path) {
  return defu({}, ..._routeRulesMatcher.matchAll(path).reverse());
}

const appConfig = {"name":"vinxi","routers":[{"name":"public","mode":"static","dir":"./public","base":"/","root":"/Users/brendonovich/github.com/brendonovich/macrograph/web-solid","order":0,"outDir":"/Users/brendonovich/github.com/brendonovich/macrograph/web-solid/.vinxi/build/public"},{"name":"ssr","mode":"handler","handler":"src/entry-server.tsx","extensions":["js","jsx","ts","tsx"],"target":"server","root":"/Users/brendonovich/github.com/brendonovich/macrograph/web-solid","base":"/","outDir":"/Users/brendonovich/github.com/brendonovich/macrograph/web-solid/.vinxi/build/ssr","order":1},{"name":"client","mode":"build","handler":"src/entry-client.tsx","extensions":["js","jsx","ts","tsx"],"target":"browser","base":"/_build","root":"/Users/brendonovich/github.com/brendonovich/macrograph/web-solid","outDir":"/Users/brendonovich/github.com/brendonovich/macrograph/web-solid/.vinxi/build/client","order":2},{"name":"server-fns","mode":"handler","base":"/_server","handler":"../node_modules/.pnpm/@solidjs+start@0.4.4_rollup@2.79.1_solid-js@1.8.8_vinxi@0.1.1_vite@5.0.11/node_modules/@solidjs/start/config/server-handler.js","target":"server","root":"/Users/brendonovich/github.com/brendonovich/macrograph/web-solid","outDir":"/Users/brendonovich/github.com/brendonovich/macrograph/web-solid/.vinxi/build/server-fns","order":3}],"server":{"compressPublicAssets":{"brotli":true},"prerender":{"crawlLinks":true}},"root":"/Users/brendonovich/github.com/brendonovich/macrograph/web-solid"};
				const buildManifest = {"ssr":{"\u0000virtual:#vinxi/handler/ssr.css":{"file":"assets/ssr-d870915a.css","src":"\u0000virtual:#vinxi/handler/ssr.css"},"src/routes/index.tsx?pick=default&pick=$css":{"file":"index.js","isDynamicEntry":true,"isEntry":true,"src":"src/routes/index.tsx?pick=default&pick=$css"},"virtual:#vinxi/handler/ssr":{"css":["assets/ssr-d870915a.css"],"dynamicImports":["src/routes/index.tsx?pick=default&pick=$css","src/routes/index.tsx?pick=default&pick=$css"],"file":"ssr.js","isEntry":true,"src":"virtual:#vinxi/handler/ssr"}},"client":{"\u0000virtual:#vinxi/handler/client.css":{"file":"assets/client-d870915a.css","src":"\u0000virtual:#vinxi/handler/client.css"},"_web-2a3f0a6b.js":{"file":"assets/web-2a3f0a6b.js"},"src/routes/index.tsx?pick=default&pick=$css":{"file":"assets/index-2a926d8e.js","imports":["_web-2a3f0a6b.js"],"isDynamicEntry":true,"isEntry":true,"src":"src/routes/index.tsx?pick=default&pick=$css"},"virtual:#vinxi/handler/client":{"css":["assets/client-d870915a.css"],"dynamicImports":["src/routes/index.tsx?pick=default&pick=$css"],"file":"assets/client-fe8a6be7.js","imports":["_web-2a3f0a6b.js"],"isEntry":true,"src":"virtual:#vinxi/handler/client"}},"server-fns":{"virtual:#vinxi/handler/server-fns":{"file":"entry.js","isEntry":true,"src":"virtual:#vinxi/handler/server-fns"}}};

				const routeManifest = {"ssr":{},"client":{}};

        function createProdApp(appConfig) {
          return {
            config: { ...appConfig, buildManifest, routeManifest },
            getRouter(name) {
              return appConfig.routers.find(router => router.name === name)
            }
          }
        }

        function plugin(app) {
          const prodApp = createProdApp(appConfig);
          globalThis.app = prodApp;
        }

const chunks = {};
			 



			 function app() {
				 globalThis.$$chunks = chunks;
			 }

const plugins = [
  plugin,
_brHrLZW5og,
_QhiIHXyToZ,
app
];

function defineNitroErrorHandler(handler) {
  return handler;
}
const errorHandler = defineNitroErrorHandler(
  function defaultNitroErrorHandler(error, event) {
    const { stack, statusCode, statusMessage, message } = normalizeError(error);
    const errorObject = {
      url: event.path || "",
      statusCode,
      statusMessage,
      message,
      stack: void 0
    };
    if (error.unhandled || error.fatal) {
      const tags = [
        "[nitro]",
        "[request error]",
        error.unhandled && "[unhandled]",
        error.fatal && "[fatal]"
      ].filter(Boolean).join(" ");
      console.error(
        tags,
        error.message + "\n" + stack.map((l) => "  " + l.text).join("  \n")
      );
    }
    setResponseStatus(event, statusCode, statusMessage);
    if (isJsonRequest(event)) {
      setResponseHeader(event, "Content-Type", "application/json");
      return send(event, JSON.stringify(errorObject));
    } else {
      setResponseHeader(event, "Content-Type", "text/html");
      return send(event, renderHTMLError(errorObject));
    }
  }
);
function renderHTMLError(error) {
  const statusCode = error.statusCode || 500;
  const statusMessage = error.statusMessage || "Request Error";
  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${statusCode} ${statusMessage}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico/css/pico.min.css">
  </head>
  <body>
    <main class="container">
      <dialog open>
        <article>
          <header>
            <h2>${statusCode} ${statusMessage}</h2>
          </header>
          <code>
            ${error.message}<br><br>
            ${"\n" + (error.stack || []).map((i) => `&nbsp;&nbsp;${i}`).join("<br>")}
          </code>
          <footer>
            <a href="/" onclick="event.preventDefault();history.back();">Go Back</a>
          </footer>
        </article>
      </dialog>
    </main>
  </body>
</html>
`;
}

const assets = {
  "/favicon.ico": {
    "type": "image/vnd.microsoft.icon",
    "etag": "\"298-hdW7/pL89QptiszdYCHH67XxLxs\"",
    "mtime": "2024-01-07T05:04:19.365Z",
    "size": 664,
    "path": "../../.output/public/favicon.ico"
  },
  "/assets/ssr-d870915a.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"17f-EyPT40t0Q2Ip557OUJ0k5vttT/g\"",
    "mtime": "2024-01-07T05:04:19.366Z",
    "size": 383,
    "path": "../../.output/public/assets/ssr-d870915a.css"
  },
  "/_build/manifest.json": {
    "type": "application/json",
    "etag": "\"320-uM/FpzfhgHos7g48hzJbSV7DUag\"",
    "mtime": "2024-01-07T05:04:19.367Z",
    "size": 800,
    "path": "../../.output/public/_build/manifest.json"
  },
  "/_build/server-functions-manifest.json": {
    "type": "application/json",
    "etag": "\"19-U+evudgPW1yE9kGumdxd/vtvk2s\"",
    "mtime": "2024-01-07T05:04:19.367Z",
    "size": 25,
    "path": "../../.output/public/_build/server-functions-manifest.json"
  },
  "/_build/assets/client-d870915a.css": {
    "type": "text/css; charset=utf-8",
    "etag": "\"17f-EyPT40t0Q2Ip557OUJ0k5vttT/g\"",
    "mtime": "2024-01-07T05:04:19.367Z",
    "size": 383,
    "path": "../../.output/public/_build/assets/client-d870915a.css"
  },
  "/_build/assets/client-fe8a6be7.js": {
    "type": "application/javascript",
    "etag": "\"48a7-tdQ0ZVCQ/ilo+8a12i8Ona4gjmo\"",
    "mtime": "2024-01-07T05:04:19.367Z",
    "size": 18599,
    "path": "../../.output/public/_build/assets/client-fe8a6be7.js"
  },
  "/_build/assets/client-fe8a6be7.js.br": {
    "type": "application/javascript",
    "encoding": "br",
    "etag": "\"1af5-Ndqul92O1I6X+HRb0aGLzEKTvNs\"",
    "mtime": "2024-01-07T05:04:19.386Z",
    "size": 6901,
    "path": "../../.output/public/_build/assets/client-fe8a6be7.js.br"
  },
  "/_build/assets/client-fe8a6be7.js.gz": {
    "type": "application/javascript",
    "encoding": "gzip",
    "etag": "\"1dd8-jX64WfeyG9yEOnCBarPb8oUvF50\"",
    "mtime": "2024-01-07T05:04:19.369Z",
    "size": 7640,
    "path": "../../.output/public/_build/assets/client-fe8a6be7.js.gz"
  },
  "/_build/assets/index-2a926d8e.js": {
    "type": "application/javascript",
    "etag": "\"324-YBODMpnLWkf5b8M7Aea8csA9oUk\"",
    "mtime": "2024-01-07T05:04:19.367Z",
    "size": 804,
    "path": "../../.output/public/_build/assets/index-2a926d8e.js"
  },
  "/_build/assets/web-2a3f0a6b.js": {
    "type": "application/javascript",
    "etag": "\"54d7-NH6qiwevGAKl3XiujlOpiN6WHe4\"",
    "mtime": "2024-01-07T05:04:19.367Z",
    "size": 21719,
    "path": "../../.output/public/_build/assets/web-2a3f0a6b.js"
  },
  "/_build/assets/web-2a3f0a6b.js.br": {
    "type": "application/javascript",
    "encoding": "br",
    "etag": "\"1e15-a3bbjB3SYxjNU2lRaNHJ88lw0Ug\"",
    "mtime": "2024-01-07T05:04:19.388Z",
    "size": 7701,
    "path": "../../.output/public/_build/assets/web-2a3f0a6b.js.br"
  },
  "/_build/assets/web-2a3f0a6b.js.gz": {
    "type": "application/javascript",
    "encoding": "gzip",
    "etag": "\"20fe-GYSH8hALmpOrSYsX4UHDNhrzrIo\"",
    "mtime": "2024-01-07T05:04:19.369Z",
    "size": 8446,
    "path": "../../.output/public/_build/assets/web-2a3f0a6b.js.gz"
  }
};

function readAsset (id) {
  const serverDir = dirname(fileURLToPath(globalThis._importMeta_.url));
  return promises.readFile(resolve(serverDir, assets[id].path))
}

const publicAssetBases = {};

function isPublicAssetURL(id = '') {
  if (assets[id]) {
    return true
  }
  for (const base in publicAssetBases) {
    if (id.startsWith(base)) { return true }
  }
  return false
}

function getAsset (id) {
  return assets[id]
}

const METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
const EncodingMap = { gzip: ".gz", br: ".br" };
const _f4b49z = eventHandler((event) => {
  if (event.method && !METHODS.has(event.method)) {
    return;
  }
  let id = decodePath(
    withLeadingSlash(withoutTrailingSlash(parseURL(event.path).pathname))
  );
  let asset;
  const encodingHeader = String(
    getRequestHeader(event, "accept-encoding") || ""
  );
  const encodings = [
    ...encodingHeader.split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(),
    ""
  ];
  if (encodings.length > 1) {
    setResponseHeader(event, "Vary", "Accept-Encoding");
  }
  for (const encoding of encodings) {
    for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
      const _asset = getAsset(_id);
      if (_asset) {
        asset = _asset;
        id = _id;
        break;
      }
    }
  }
  if (!asset) {
    if (isPublicAssetURL(id)) {
      removeResponseHeader(event, "Cache-Control");
      throw createError({
        statusMessage: "Cannot find static asset " + id,
        statusCode: 404
      });
    }
    return;
  }
  const ifNotMatch = getRequestHeader(event, "if-none-match") === asset.etag;
  if (ifNotMatch) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  const ifModifiedSinceH = getRequestHeader(event, "if-modified-since");
  const mtimeDate = new Date(asset.mtime);
  if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
    setResponseStatus(event, 304, "Not Modified");
    return "";
  }
  if (asset.type && !getResponseHeader(event, "Content-Type")) {
    setResponseHeader(event, "Content-Type", asset.type);
  }
  if (asset.etag && !getResponseHeader(event, "ETag")) {
    setResponseHeader(event, "ETag", asset.etag);
  }
  if (asset.mtime && !getResponseHeader(event, "Last-Modified")) {
    setResponseHeader(event, "Last-Modified", mtimeDate.toUTCString());
  }
  if (asset.encoding && !getResponseHeader(event, "Content-Encoding")) {
    setResponseHeader(event, "Content-Encoding", asset.encoding);
  }
  if (asset.size > 0 && !getResponseHeader(event, "Content-Length")) {
    setResponseHeader(event, "Content-Length", asset.size);
  }
  return readAsset(id);
});

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
var Ee$1 = ((t) => (t[t.AggregateError = 1] = "AggregateError", t[t.ArrowFunction = 2] = "ArrowFunction", t[t.ErrorPrototypeStack = 4] = "ErrorPrototypeStack", t[t.ObjectAssign = 8] = "ObjectAssign", t[t.BigIntTypedArray = 16] = "BigIntTypedArray", t))(Ee$1 || {});
function h(t, e) {
  if (!t)
    throw e;
}
function Ie(t) {
  switch (t) {
    case '"':
      return '\\"';
    case "\\":
      return "\\\\";
    case `
`:
      return "\\n";
    case "\r":
      return "\\r";
    case "\b":
      return "\\b";
    case "	":
      return "\\t";
    case "\f":
      return "\\f";
    case "<":
      return "\\x3C";
    case "\u2028":
      return "\\u2028";
    case "\u2029":
      return "\\u2029";
    default:
      return;
  }
}
function f(t) {
  let e = "", r = 0, i;
  for (let s = 0, a = t.length; s < a; s++)
    i = Ie(t[s]), i && (e += t.slice(r, s) + i, r = s + 1);
  return r === 0 ? e = t : e += t.slice(r), e;
}
function Ae$1(t) {
  switch (t) {
    case "\\\\":
      return "\\";
    case '\\"':
      return '"';
    case "\\n":
      return `
`;
    case "\\r":
      return "\r";
    case "\\b":
      return "\b";
    case "\\t":
      return "	";
    case "\\f":
      return "\f";
    case "\\x3C":
      return "<";
    case "\\u2028":
      return "\u2028";
    case "\\u2029":
      return "\u2029";
    default:
      return t;
  }
}
function v(t) {
  return t.replace(/(\\\\|\\"|\\n|\\r|\\b|\\t|\\f|\\u2028|\\u2029|\\x3C)/g, Ae$1);
}
var m = "__SEROVAL_REFS__", I = "$R", E = `self.${I}`;
function Re$1(t) {
  return t == null ? `${E}=${E}||[]` : `(${E}=${E}||{})["${f(t)}"]=[]`;
}
var Q$1 = /* @__PURE__ */ new Map(), g = /* @__PURE__ */ new Map();
function j(t) {
  return Q$1.has(t);
}
function xe(t) {
  return g.has(t);
}
function Pe$1(t) {
  return h(j(t), new Error("Missing reference id")), Q$1.get(t);
}
function ke(t) {
  return h(xe(t), new Error("Missing reference for id:" + t)), g.get(t);
}
typeof globalThis < "u" ? Object.defineProperty(globalThis, m, { value: g, configurable: true, writable: false, enumerable: false }) : typeof self < "u" ? Object.defineProperty(self, m, { value: g, configurable: true, writable: false, enumerable: false }) : typeof global < "u" && Object.defineProperty(global, m, { value: g, configurable: true, writable: false, enumerable: false });
function X$1(t, e) {
  for (let r = 0, i = e.length; r < i; r++) {
    let s = e[r];
    t.has(s) || (t.add(s), s.extends && X$1(t, s.extends));
  }
}
function Y$1(t) {
  if (t) {
    let e = /* @__PURE__ */ new Set();
    return X$1(e, t), [...e];
  }
}
var { toString: Fe } = Object.prototype, _ = class extends Error {
  constructor(e) {
    super('Unsupported type "' + Fe.call(e) + '"'), this.value = e;
  }
}, Ve = { 0: "Symbol.asyncIterator", 1: "Symbol.hasInstance", 2: "Symbol.isConcatSpreadable", 3: "Symbol.iterator", 4: "Symbol.match", 5: "Symbol.matchAll", 6: "Symbol.replace", 7: "Symbol.search", 8: "Symbol.species", 9: "Symbol.split", 10: "Symbol.toPrimitive", 11: "Symbol.toStringTag", 12: "Symbol.unscopables" }, C = { [Symbol.asyncIterator]: 0, [Symbol.hasInstance]: 1, [Symbol.isConcatSpreadable]: 2, [Symbol.iterator]: 3, [Symbol.match]: 4, [Symbol.matchAll]: 5, [Symbol.replace]: 6, [Symbol.search]: 7, [Symbol.species]: 8, [Symbol.split]: 9, [Symbol.toPrimitive]: 10, [Symbol.toStringTag]: 11, [Symbol.unscopables]: 12 }, Oe = { 0: Symbol.asyncIterator, 1: Symbol.hasInstance, 2: Symbol.isConcatSpreadable, 3: Symbol.iterator, 4: Symbol.match, 5: Symbol.matchAll, 6: Symbol.replace, 7: Symbol.search, 8: Symbol.species, 9: Symbol.split, 10: Symbol.toPrimitive, 11: Symbol.toStringTag, 12: Symbol.unscopables }, je = { 2: "!0", 3: "!1", 1: "void 0", 0: "null", 4: "-0", 5: "1/0", 6: "-1/0", 7: "0/0" }, Ce$1 = { 2: true, 3: false, 1: void 0, 0: null, 4: -0, 5: 1 / 0, 6: -1 / 0, 7: NaN }, ee$1 = { 0: "Error", 1: "EvalError", 2: "RangeError", 3: "ReferenceError", 4: "SyntaxError", 5: "TypeError", 6: "URIError" }, De = { 0: Error, 1: EvalError, 2: RangeError, 3: ReferenceError, 4: SyntaxError, 5: TypeError, 6: URIError };
function p(t) {
  return { t: 2, i: void 0, s: t, l: void 0, c: void 0, m: void 0, p: void 0, e: void 0, a: void 0, f: void 0, b: void 0, o: void 0 };
}
var D = p(2), M = p(3), Me = p(1), Te$1 = p(0), $e$1 = p(4), Ue = p(5), Be = p(6), _e = p(7);
function U$1(t) {
  return t instanceof EvalError ? 1 : t instanceof RangeError ? 2 : t instanceof ReferenceError ? 3 : t instanceof SyntaxError ? 4 : t instanceof TypeError ? 5 : t instanceof URIError ? 6 : 0;
}
function We(t) {
  let e = ee$1[U$1(t)];
  return t.name !== e ? { name: t.name } : t.constructor.name !== e ? { name: t.constructor.name } : {};
}
function W(t, e) {
  let r = We(t), i = Object.getOwnPropertyNames(t);
  for (let s = 0, a = i.length, n; s < a; s++)
    n = i[s], n !== "name" && n !== "message" && (n === "stack" ? e & 4 && (r = r || {}, r[n] = t[n]) : (r = r || {}, r[n] = t[n]));
  return r;
}
function te(t) {
  return Object.isFrozen(t) ? 3 : Object.isSealed(t) ? 2 : Object.isExtensible(t) ? 0 : 1;
}
function Ne(t) {
  switch (t) {
    case 1 / 0:
      return Ue;
    case -1 / 0:
      return Be;
  }
  return t !== t ? _e : Object.is(t, -0) ? $e$1 : { t: 0, i: void 0, s: t, l: void 0, c: void 0, m: void 0, p: void 0, e: void 0, a: void 0, f: void 0, b: void 0, o: void 0 };
}
function T(t) {
  return { t: 1, i: void 0, s: f(t), l: void 0, c: void 0, m: void 0, p: void 0, e: void 0, a: void 0, f: void 0, b: void 0, o: void 0 };
}
function Le(t) {
  return { t: 3, i: void 0, s: "" + t, l: void 0, c: void 0, m: void 0, p: void 0, e: void 0, a: void 0, f: void 0, b: void 0, o: void 0 };
}
function qe(t) {
  return { t: 4, i: t, s: void 0, l: void 0, c: void 0, m: void 0, p: void 0, e: void 0, a: void 0, f: void 0, b: void 0, o: void 0 };
}
function Ke(t, e) {
  return { t: 5, i: t, s: e.toISOString(), l: void 0, c: void 0, m: void 0, p: void 0, e: void 0, f: void 0, a: void 0, b: void 0, o: void 0 };
}
function He(t, e) {
  return { t: 6, i: t, s: void 0, l: void 0, c: f(e.source), m: e.flags, p: void 0, e: void 0, a: void 0, f: void 0, b: void 0, o: void 0 };
}
function Ze(t, e) {
  let r = new Uint8Array(e), i = r.length, s = new Array(i);
  for (let a = 0; a < i; a++)
    s[a] = r[a];
  return { t: 19, i: t, s, l: void 0, c: void 0, m: void 0, p: void 0, e: void 0, a: void 0, f: void 0, b: void 0, o: void 0 };
}
function Je(t, e) {
  return h(e in C, new Error("Only well-known symbols are supported.")), { t: 17, i: t, s: C[e], l: void 0, c: void 0, m: void 0, p: void 0, e: void 0, a: void 0, f: void 0, b: void 0, o: void 0 };
}
function N$1(t, e) {
  return { t: 18, i: t, s: f(Pe$1(e)), l: void 0, c: void 0, m: void 0, p: void 0, e: void 0, a: void 0, f: void 0, b: void 0, o: void 0 };
}
function re(t, e, r) {
  return { t: 25, i: t, s: r, l: void 0, c: f(e), m: void 0, p: void 0, e: void 0, a: void 0, f: void 0, b: void 0, o: void 0 };
}
function Ge(t, e, r) {
  return { t: 9, i: t, s: void 0, l: e.length, c: void 0, m: void 0, p: void 0, e: void 0, a: r, f: void 0, b: void 0, o: te(e) };
}
function Qe(t, e) {
  return { t: 21, i: t, s: void 0, l: void 0, c: void 0, m: void 0, p: void 0, e: void 0, a: void 0, f: e, b: void 0, o: void 0 };
}
function Xe(t, e, r) {
  return { t: 15, i: t, s: void 0, l: e.length, c: e.constructor.name, m: void 0, p: void 0, e: void 0, a: void 0, f: r, b: e.byteOffset, o: void 0 };
}
function Ye(t, e, r) {
  return { t: 16, i: t, s: void 0, l: e.length, c: e.constructor.name, m: void 0, p: void 0, e: void 0, a: void 0, f: r, b: e.byteOffset, o: void 0 };
}
function et(t, e, r) {
  return { t: 20, i: t, s: void 0, l: e.byteLength, c: void 0, m: void 0, p: void 0, e: void 0, a: void 0, f: r, b: e.byteOffset, o: void 0 };
}
function tt(t, e, r) {
  return { t: 13, i: t, s: U$1(e), l: void 0, c: void 0, m: f(e.message), p: r, e: void 0, a: void 0, f: void 0, b: void 0, o: void 0 };
}
function rt(t, e, r) {
  return { t: 14, i: t, s: U$1(e), l: void 0, c: void 0, m: f(e.message), p: r, e: void 0, a: void 0, f: void 0, b: void 0, o: void 0 };
}
function it$1(t, e, r) {
  return { t: 7, i: t, s: void 0, l: e, c: void 0, m: void 0, p: void 0, e: void 0, a: r, f: void 0, b: void 0, o: void 0 };
}
function ie$1(t, e) {
  return { t: 28, i: void 0, s: void 0, l: void 0, c: void 0, m: void 0, p: void 0, e: void 0, a: [t, e], f: void 0, b: void 0, o: void 0 };
}
function se(t, e) {
  return { t: 30, i: void 0, s: void 0, l: void 0, c: void 0, m: void 0, p: void 0, e: void 0, a: [t, e], f: void 0, b: void 0, o: void 0 };
}
function ae$1(t, e, r) {
  return { t: 31, i: t, s: void 0, l: void 0, c: void 0, m: void 0, p: void 0, e: void 0, a: r, f: e, b: void 0, o: void 0 };
}
function st(t, e) {
  return { t: 32, i: t, s: void 0, l: void 0, c: void 0, m: void 0, p: void 0, e: void 0, a: void 0, f: e, b: void 0, o: void 0 };
}
function at$1(t, e) {
  return { t: 33, i: t, s: void 0, l: void 0, c: void 0, m: void 0, p: void 0, e: void 0, a: void 0, f: e, b: void 0, o: void 0 };
}
function nt(t, e) {
  return { t: 34, i: t, s: void 0, l: void 0, c: void 0, m: void 0, p: void 0, e: void 0, a: void 0, f: e, b: void 0, o: void 0 };
}
function ne(t) {
  let e = [], r = -1, i = -1, s = t[Symbol.iterator]();
  for (; ; )
    try {
      let a = s.next();
      if (e.push(a.value), a.done) {
        i = e.length - 1;
        break;
      }
    } catch (a) {
      r = e.length, e.push(a);
    }
  return { v: e, t: r, d: i };
}
function ot$1(t) {
  return () => {
    let e = 0;
    return { [Symbol.iterator]() {
      return this;
    }, next() {
      if (e > t.d)
        return { done: true, value: void 0 };
      let r = e++, i = t.v[r];
      if (r === t.t)
        throw i;
      return { done: r === t.d, value: i };
    } };
  };
}
var lt$1 = {}, ut$1 = {}, ct$1 = { 0: {}, 1: {}, 2: {}, 3: {}, 4: {} }, dt$1 = class dt {
  constructor(e) {
    this.marked = /* @__PURE__ */ new Set(), this.plugins = e.plugins, this.features = 31 ^ (e.disabledFeatures || 0), this.refs = e.refs || /* @__PURE__ */ new Map();
  }
  markRef(e) {
    this.marked.add(e);
  }
  isMarked(e) {
    return this.marked.has(e);
  }
  getIndexedValue(e) {
    let r = this.refs.get(e);
    if (r != null)
      return this.markRef(r), { type: 1, value: qe(r) };
    let i = this.refs.size;
    return this.refs.set(e, i), { type: 0, value: i };
  }
  getReference(e) {
    let r = this.getIndexedValue(e);
    return r.type === 1 ? r : j(e) ? { type: 2, value: N$1(r.value, e) } : r;
  }
  getStrictReference(e) {
    h(j(e), new Error("Cannot serialize " + typeof e + " without reference ID."));
    let r = this.getIndexedValue(e);
    return r.type === 1 ? r.value : N$1(r.value, e);
  }
  parseFunction(e) {
    return this.getStrictReference(e);
  }
  parseWellKnownSymbol(e) {
    let r = this.getReference(e);
    return r.type !== 0 ? r.value : (h(e in C, new Error("Cannot serialized unsupported symbol.")), Je(r.value, e));
  }
  parseSpecialReference(e) {
    let r = this.getIndexedValue(ct$1[e]);
    return r.type === 1 ? r.value : { t: 26, i: r.value, s: e, l: void 0, c: void 0, m: void 0, p: void 0, e: void 0, a: void 0, f: void 0, b: void 0, o: void 0 };
  }
  parseIteratorFactory() {
    let e = this.getIndexedValue(lt$1);
    return e.type === 1 ? e.value : { t: 27, i: e.value, s: void 0, l: void 0, c: void 0, m: void 0, p: void 0, e: void 0, a: void 0, f: this.parseWellKnownSymbol(Symbol.iterator), b: void 0, o: void 0 };
  }
  parseAsyncIteratorFactory() {
    let e = this.getIndexedValue(ut$1);
    return e.type === 1 ? e.value : { t: 29, i: e.value, s: void 0, l: void 0, c: void 0, m: void 0, p: void 0, e: void 0, a: [this.parseSpecialReference(1), this.parseWellKnownSymbol(Symbol.asyncIterator)], f: void 0, b: void 0, o: void 0 };
  }
  createObjectNode(e, r, i, s) {
    return { t: i ? 11 : 10, i: e, s: void 0, l: void 0, c: void 0, m: void 0, p: s, e: void 0, a: void 0, f: void 0, b: void 0, o: te(r) };
  }
  createMapNode(e, r, i, s) {
    return { t: 8, i: e, s: void 0, l: void 0, c: void 0, m: void 0, p: void 0, e: { k: r, v: i, s }, a: void 0, f: this.parseSpecialReference(0), b: void 0, o: void 0 };
  }
  createPromiseConstructorNode(e) {
    return { t: 22, i: e, s: void 0, l: void 0, c: void 0, m: void 0, p: void 0, e: void 0, a: void 0, f: this.parseSpecialReference(1), b: void 0, o: void 0 };
  }
};
function $$1() {
  let t, e;
  return { promise: new Promise((r, i) => {
    t = r, e = i;
  }), resolve(r) {
    t(r);
  }, reject(r) {
    e(r);
  } };
}
function ht$1(t) {
  return "__SEROVAL_STREAM__" in t;
}
function w() {
  let t = /* @__PURE__ */ new Set(), e = [], r = true, i = false;
  function s(o) {
    for (let l of t.keys())
      l.next(o);
  }
  function a(o) {
    for (let l of t.keys())
      l.throw(o);
  }
  function n(o) {
    for (let l of t.keys())
      l.return(o);
  }
  return { __SEROVAL_STREAM__: true, on(o) {
    r && t.add(o);
    for (let l = 0, u = e.length; l < u; l++) {
      let d = e[l];
      l === u - 1 ? i ? o.return(d) : o.throw(d) : o.next(d);
    }
    return () => {
      r && t.delete(o);
    };
  }, next(o) {
    r && (e.push(o), s(o));
  }, throw(o) {
    r && (e.push(o), a(o), r = false, i = false, t.clear());
  }, return(o) {
    r && (e.push(o), n(o), r = false, i = true, t.clear());
  } };
}
function ft$1(t) {
  let e = w(), r = t[Symbol.asyncIterator]();
  async function i() {
    try {
      let s = await r.next();
      s.done ? e.return(s.value) : (e.next(s.value), await i());
    } catch (s) {
      e.throw(s);
    }
  }
  return i().catch(() => {
  }), e;
}
function pt$1(t) {
  return () => {
    let e = [], r = [], i = 0, s = -1, a = false;
    function n() {
      for (let l = 0, u = r.length; l < u; l++)
        r[l].resolve({ done: true, value: void 0 });
    }
    t.on({ next(l) {
      let u = r.shift();
      u && u.resolve({ done: false, value: l }), e.push(l);
    }, throw(l) {
      let u = r.shift();
      u && u.reject(l), n(), s = e.length, e.push(l), a = true;
    }, return(l) {
      let u = r.shift();
      u && u.resolve({ done: true, value: l }), n(), s = e.length, e.push(l);
    } });
    function o() {
      let l = i++, u = e[l];
      if (l !== s)
        return { done: false, value: u };
      if (a)
        throw u;
      return { done: true, value: u };
    }
    return { [Symbol.asyncIterator]() {
      return this;
    }, async next() {
      if (s === -1) {
        let l = i++;
        if (l >= e.length) {
          let u = $$1();
          return r.push(u), await u.promise;
        }
        return { done: false, value: e[l] };
      }
      return i > s ? { done: true, value: void 0 } : o();
    } };
  };
}
function vt$1(t) {
  switch (t) {
    case "Int8Array":
      return Int8Array;
    case "Int16Array":
      return Int16Array;
    case "Int32Array":
      return Int32Array;
    case "Uint8Array":
      return Uint8Array;
    case "Uint16Array":
      return Uint16Array;
    case "Uint32Array":
      return Uint32Array;
    case "Uint8ClampedArray":
      return Uint8ClampedArray;
    case "Float32Array":
      return Float32Array;
    case "Float64Array":
      return Float64Array;
    case "BigInt64Array":
      return BigInt64Array;
    case "BigUint64Array":
      return BigUint64Array;
    default:
      throw new Error(`Unknown TypedArray "${t}"`);
  }
}
function L(t, e) {
  switch (e) {
    case 3:
      return Object.freeze(t);
    case 1:
      return Object.preventExtensions(t);
    case 2:
      return Object.seal(t);
    default:
      return t;
  }
}
var gt$1 = class gt {
  constructor(e) {
    this.plugins = e.plugins, this.refs = e.refs || /* @__PURE__ */ new Map();
  }
  deserializeReference(e) {
    return this.assignIndexedValue(e.i, ke(v(e.s)));
  }
  deserializeArray(e) {
    let r = e.l, i = this.assignIndexedValue(e.i, new Array(r)), s;
    for (let a = 0; a < r; a++)
      s = e.a[a], s && (i[a] = this.deserialize(s));
    return L(i, e.o), i;
  }
  deserializeProperties(e, r) {
    let i = e.s;
    if (i) {
      let s = e.k, a = e.v;
      for (let n = 0, o; n < i; n++)
        o = s[n], typeof o == "string" ? r[v(o)] = this.deserialize(a[n]) : r[this.deserialize(o)] = this.deserialize(a[n]);
    }
    return r;
  }
  deserializeObject(e) {
    let r = this.assignIndexedValue(e.i, e.t === 10 ? {} : /* @__PURE__ */ Object.create(null));
    return this.deserializeProperties(e.p, r), L(r, e.o), r;
  }
  deserializeDate(e) {
    return this.assignIndexedValue(e.i, new Date(e.s));
  }
  deserializeRegExp(e) {
    return this.assignIndexedValue(e.i, new RegExp(v(e.c), e.m));
  }
  deserializeSet(e) {
    let r = this.assignIndexedValue(e.i, /* @__PURE__ */ new Set()), i = e.a;
    for (let s = 0, a = e.l; s < a; s++)
      r.add(this.deserialize(i[s]));
    return r;
  }
  deserializeMap(e) {
    let r = this.assignIndexedValue(e.i, /* @__PURE__ */ new Map()), i = e.e.k, s = e.e.v;
    for (let a = 0, n = e.e.s; a < n; a++)
      r.set(this.deserialize(i[a]), this.deserialize(s[a]));
    return r;
  }
  deserializeArrayBuffer(e) {
    let r = new Uint8Array(e.s);
    return this.assignIndexedValue(e.i, r.buffer);
  }
  deserializeTypedArray(e) {
    let r = vt$1(e.c), i = this.deserialize(e.f);
    return this.assignIndexedValue(e.i, new r(i, e.b, e.l));
  }
  deserializeDataView(e) {
    let r = this.deserialize(e.f);
    return this.assignIndexedValue(e.i, new DataView(r, e.b, e.l));
  }
  deserializeDictionary(e, r) {
    if (e.p) {
      let i = this.deserializeProperties(e.p, {});
      Object.assign(r, i);
    }
    return r;
  }
  deserializeAggregateError(e) {
    let r = this.assignIndexedValue(e.i, new AggregateError([], v(e.m)));
    return this.deserializeDictionary(e, r);
  }
  deserializeError(e) {
    let r = De[e.s], i = this.assignIndexedValue(e.i, new r(v(e.m)));
    return this.deserializeDictionary(e, i);
  }
  deserializePromise(e) {
    let r = $$1(), i = this.assignIndexedValue(e.i, r), s = this.deserialize(e.f);
    return e.s ? r.resolve(s) : r.reject(s), i.promise;
  }
  deserializeBoxed(e) {
    return this.assignIndexedValue(e.i, Object(this.deserialize(e.f)));
  }
  deserializePlugin(e) {
    let r = this.plugins;
    if (r) {
      let i = v(e.c);
      for (let s = 0, a = r.length; s < a; s++) {
        let n = r[s];
        if (n.tag === i)
          return this.assignIndexedValue(e.i, n.deserialize(e.s, this, { id: e.i }));
      }
    }
    throw new Error('Missing plugin for tag "' + e.c + '".');
  }
  deserializePromiseConstructor(e) {
    return this.assignIndexedValue(e.i, $$1()).promise;
  }
  deserializePromiseResolve(e) {
    let r = this.refs.get(e.i);
    h(r, new Error("Missing Promise instance.")), r.resolve(this.deserialize(e.a[1]));
  }
  deserializePromiseReject(e) {
    let r = this.refs.get(e.i);
    h(r, new Error("Missing Promise instance.")), r.reject(this.deserialize(e.a[1]));
  }
  deserializeIteratorFactoryInstance(e) {
    this.deserialize(e.a[0]);
    let r = this.deserialize(e.a[1]);
    return ot$1(r);
  }
  deserializeAsyncIteratorFactoryInstance(e) {
    this.deserialize(e.a[0]);
    let r = this.deserialize(e.a[1]);
    return pt$1(r);
  }
  deserializeStreamConstructor(e) {
    let r = this.assignIndexedValue(e.i, w()), i = e.a.length;
    if (i)
      for (let s = 0; s < i; s++)
        this.deserialize(e.a[s]);
    return r;
  }
  deserializeStreamNext(e) {
    let r = this.refs.get(e.i);
    h(r, new Error("Missing Stream instance.")), r.next(this.deserialize(e.f));
  }
  deserializeStreamThrow(e) {
    let r = this.refs.get(e.i);
    h(r, new Error("Missing Stream instance.")), r.throw(this.deserialize(e.f));
  }
  deserializeStreamReturn(e) {
    let r = this.refs.get(e.i);
    h(r, new Error("Missing Stream instance.")), r.return(this.deserialize(e.f));
  }
  deserializeIteratorFactory(e) {
    this.deserialize(e.f);
  }
  deserializeAsyncIteratorFactory(e) {
    this.deserialize(e.a[1]);
  }
  deserialize(e) {
    switch (e.t) {
      case 2:
        return Ce$1[e.s];
      case 0:
        return e.s;
      case 1:
        return v(e.s);
      case 3:
        return BigInt(e.s);
      case 4:
        return this.refs.get(e.i);
      case 18:
        return this.deserializeReference(e);
      case 9:
        return this.deserializeArray(e);
      case 10:
      case 11:
        return this.deserializeObject(e);
      case 5:
        return this.deserializeDate(e);
      case 6:
        return this.deserializeRegExp(e);
      case 7:
        return this.deserializeSet(e);
      case 8:
        return this.deserializeMap(e);
      case 19:
        return this.deserializeArrayBuffer(e);
      case 16:
      case 15:
        return this.deserializeTypedArray(e);
      case 20:
        return this.deserializeDataView(e);
      case 14:
        return this.deserializeAggregateError(e);
      case 13:
        return this.deserializeError(e);
      case 12:
        return this.deserializePromise(e);
      case 17:
        return Oe[e.s];
      case 21:
        return this.deserializeBoxed(e);
      case 25:
        return this.deserializePlugin(e);
      case 22:
        return this.deserializePromiseConstructor(e);
      case 23:
        return this.deserializePromiseResolve(e);
      case 24:
        return this.deserializePromiseReject(e);
      case 28:
        return this.deserializeIteratorFactoryInstance(e);
      case 30:
        return this.deserializeAsyncIteratorFactoryInstance(e);
      case 31:
        return this.deserializeStreamConstructor(e);
      case 32:
        return this.deserializeStreamNext(e);
      case 33:
        return this.deserializeStreamThrow(e);
      case 34:
        return this.deserializeStreamReturn(e);
      case 27:
        return this.deserializeIteratorFactory(e);
      case 29:
        return this.deserializeAsyncIteratorFactory(e);
      default:
        throw new Error("invariant");
    }
  }
}, mt$1 = class mt extends gt$1 {
  constructor(t) {
    super(t), this.mode = "vanilla", this.marked = new Set(t.markedRefs);
  }
  assignIndexedValue(t, e) {
    return this.marked.has(t) && this.refs.set(t, e), e;
  }
}, yt$1 = /^[$A-Z_][0-9A-Z_$]*$/i;
function q(t) {
  let e = t[0];
  return (e === "$" || e === "_" || e >= "A" && e <= "Z" || e >= "a" && e <= "z") && yt$1.test(t);
}
function y(t) {
  switch (t.t) {
    case 0:
      return t.s + "=" + t.v;
    case 2:
      return t.s + ".set(" + t.k + "," + t.v + ")";
    case 1:
      return t.s + ".add(" + t.v + ")";
    case 3:
      return t.s + ".delete(" + t.k + ")";
  }
}
function bt$1(t) {
  let e = [], r = t[0];
  for (let i = 1, s = t.length, a, n = r; i < s; i++)
    a = t[i], a.t === 0 && a.v === n.v ? r = { t: 0, s: a.s, k: void 0, v: y(r) } : a.t === 2 && a.s === n.s ? r = { t: 2, s: y(r), k: a.k, v: a.v } : a.t === 1 && a.s === n.s ? r = { t: 1, s: y(r), k: void 0, v: a.v } : a.t === 3 && a.s === n.s ? r = { t: 3, s: y(r), k: a.k, v: void 0 } : (e.push(r), r = a), n = a;
  return e.push(r), e;
}
function K(t) {
  if (t.length) {
    let e = "", r = bt$1(t);
    for (let i = 0, s = r.length; i < s; i++)
      e += y(r[i]) + ",";
    return e;
  }
}
var zt$1 = "Object.create(null)", wt$1 = "new Set", St$1 = "new Map", Et$1 = "Promise.resolve", It$1 = "Promise.reject", At$1 = { 3: "Object.freeze", 2: "Object.seal", 1: "Object.preventExtensions", 0: void 0 }, Rt$1 = class Rt {
  constructor(t) {
    this.stack = [], this.flags = [], this.assignments = [], this.plugins = t.plugins, this.features = t.features, this.marked = new Set(t.markedRefs);
  }
  createFunction(t, e) {
    return this.features & 2 ? (t.length === 1 ? t[0] : "(" + t.join(",") + ")") + "=>" + e : "function(" + t.join(",") + "){return " + e + "}";
  }
  createEffectfulFunction(t, e) {
    return this.features & 2 ? (t.length === 1 ? t[0] : "(" + t.join(",") + ")") + "=>{" + e + "}" : "function(" + t.join(",") + "){" + e + "}";
  }
  markRef(t) {
    this.marked.add(t);
  }
  isMarked(t) {
    return this.marked.has(t);
  }
  pushObjectFlag(t, e) {
    t !== 0 && (this.markRef(e), this.flags.push({ type: t, value: this.getRefParam(e) }));
  }
  resolveFlags() {
    let t = "";
    for (let e = 0, r = this.flags, i = r.length; e < i; e++) {
      let s = r[e];
      t += At$1[s.type] + "(" + s.value + "),";
    }
    return t;
  }
  resolvePatches() {
    let t = K(this.assignments), e = this.resolveFlags();
    return t ? e ? t + e : t : e;
  }
  createAssignment(t, e) {
    this.assignments.push({ t: 0, s: t, k: void 0, v: e });
  }
  createAddAssignment(t, e) {
    this.assignments.push({ t: 1, s: this.getRefParam(t), k: void 0, v: e });
  }
  createSetAssignment(t, e, r) {
    this.assignments.push({ t: 2, s: this.getRefParam(t), k: e, v: r });
  }
  createDeleteAssignment(t, e) {
    this.assignments.push({ t: 3, s: this.getRefParam(t), k: e, v: void 0 });
  }
  createArrayAssign(t, e, r) {
    this.createAssignment(this.getRefParam(t) + "[" + e + "]", r);
  }
  createObjectAssign(t, e, r) {
    this.createAssignment(this.getRefParam(t) + "." + e, r);
  }
  isIndexedValueInStack(t) {
    return t.t === 4 && this.stack.includes(t.i);
  }
  serializeReference(t) {
    return this.assignIndexedValue(t.i, m + '.get("' + t.s + '")');
  }
  serializeArrayItem(t, e, r) {
    return e ? this.isIndexedValueInStack(e) ? (this.markRef(t), this.createArrayAssign(t, r, this.getRefParam(e.i)), "") : this.serialize(e) : "";
  }
  serializeArray(t) {
    let e = t.i;
    if (t.l) {
      this.stack.push(e);
      let r = t.a, i = this.serializeArrayItem(e, r[0], 0), s = i === "";
      for (let a = 1, n = t.l, o; a < n; a++)
        o = this.serializeArrayItem(e, r[a], a), i += "," + o, s = o === "";
      return this.stack.pop(), this.pushObjectFlag(t.o, t.i), this.assignIndexedValue(e, "[" + i + (s ? ",]" : "]"));
    }
    return this.assignIndexedValue(e, "[]");
  }
  serializeProperty(t, e, r) {
    if (typeof e == "string") {
      let i = Number(e), s = i >= 0 && i.toString() === e || q(e);
      if (this.isIndexedValueInStack(r)) {
        let a = this.getRefParam(r.i);
        return this.markRef(t.i), s && i !== i ? this.createObjectAssign(t.i, e, a) : this.createArrayAssign(t.i, s ? e : '"' + e + '"', a), "";
      }
      return (s ? e : '"' + e + '"') + ":" + this.serialize(r);
    }
    return "[" + this.serialize(e) + "]:" + this.serialize(r);
  }
  serializeProperties(t, e) {
    let r = e.s;
    if (r) {
      let i = e.k, s = e.v;
      this.stack.push(t.i);
      let a = this.serializeProperty(t, i[0], s[0]);
      for (let n = 1, o = a; n < r; n++)
        o = this.serializeProperty(t, i[n], s[n]), a += (o && a && ",") + o;
      return this.stack.pop(), "{" + a + "}";
    }
    return "{}";
  }
  serializeObject(t) {
    return this.pushObjectFlag(t.o, t.i), this.assignIndexedValue(t.i, this.serializeProperties(t, t.p));
  }
  serializeWithObjectAssign(t, e, r) {
    let i = this.serializeProperties(t, e);
    return i !== "{}" ? "Object.assign(" + r + "," + i + ")" : r;
  }
  serializeStringKeyAssignment(t, e, r, i) {
    let s = this.serialize(i), a = Number(r), n = a >= 0 && a.toString() === r || q(r);
    if (this.isIndexedValueInStack(i))
      n && a !== a ? this.createObjectAssign(t.i, r, s) : this.createArrayAssign(t.i, n ? r : '"' + r + '"', s);
    else {
      let o = this.assignments;
      this.assignments = e, n && a !== a ? this.createObjectAssign(t.i, r, s) : this.createArrayAssign(t.i, n ? r : '"' + r + '"', s), this.assignments = o;
    }
  }
  serializeAssignment(t, e, r, i) {
    if (typeof r == "string")
      this.serializeStringKeyAssignment(t, e, r, i);
    else {
      let s = this.stack;
      this.stack = [];
      let a = this.serialize(i);
      this.stack = s;
      let n = this.assignments;
      this.assignments = e, this.createArrayAssign(t.i, this.serialize(r), a), this.assignments = n;
    }
  }
  serializeAssignments(t, e) {
    let r = e.s;
    if (r) {
      let i = [], s = e.k, a = e.v;
      this.stack.push(t.i);
      for (let n = 0; n < r; n++)
        this.serializeAssignment(t, i, s[n], a[n]);
      return this.stack.pop(), K(i);
    }
  }
  serializeDictionary(t, e) {
    if (t.p)
      if (this.features & 8)
        e = this.serializeWithObjectAssign(t, t.p, e);
      else {
        this.markRef(t.i);
        let r = this.serializeAssignments(t, t.p);
        if (r)
          return "(" + this.assignIndexedValue(t.i, e) + "," + r + this.getRefParam(t.i) + ")";
      }
    return this.assignIndexedValue(t.i, e);
  }
  serializeNullConstructor(t) {
    return this.pushObjectFlag(t.o, t.i), this.serializeDictionary(t, zt$1);
  }
  serializeDate(t) {
    return this.assignIndexedValue(t.i, 'new Date("' + t.s + '")');
  }
  serializeRegExp(t) {
    return this.assignIndexedValue(t.i, "/" + t.c + "/" + t.m);
  }
  serializeSetItem(t, e) {
    return this.isIndexedValueInStack(e) ? (this.markRef(t), this.createAddAssignment(t, this.getRefParam(e.i)), "") : this.serialize(e);
  }
  serializeSet(t) {
    let e = wt$1, r = t.l, i = t.i;
    if (r) {
      let s = t.a;
      this.stack.push(i);
      let a = this.serializeSetItem(i, s[0]);
      for (let n = 1, o = a; n < r; n++)
        o = this.serializeSetItem(i, s[n]), a += (o && a && ",") + o;
      this.stack.pop(), a && (e += "([" + a + "])");
    }
    return this.assignIndexedValue(i, e);
  }
  serializeMapEntry(t, e, r, i) {
    if (this.isIndexedValueInStack(e)) {
      let s = this.getRefParam(e.i);
      if (this.markRef(t), this.isIndexedValueInStack(r)) {
        let n = this.getRefParam(r.i);
        return this.createSetAssignment(t, s, n), "";
      }
      if (r.t !== 4 && r.i != null && this.isMarked(r.i)) {
        let n = "(" + this.serialize(r) + ",[" + i + "," + i + "])";
        return this.createSetAssignment(t, s, this.getRefParam(r.i)), this.createDeleteAssignment(t, i), n;
      }
      let a = this.stack;
      return this.stack = [], this.createSetAssignment(t, s, this.serialize(r)), this.stack = a, "";
    }
    if (this.isIndexedValueInStack(r)) {
      let s = this.getRefParam(r.i);
      if (this.markRef(t), e.t !== 4 && e.i != null && this.isMarked(e.i)) {
        let n = "(" + this.serialize(e) + ",[" + i + "," + i + "])";
        return this.createSetAssignment(t, this.getRefParam(e.i), s), this.createDeleteAssignment(t, i), n;
      }
      let a = this.stack;
      return this.stack = [], this.createSetAssignment(t, this.serialize(e), s), this.stack = a, "";
    }
    return "[" + this.serialize(e) + "," + this.serialize(r) + "]";
  }
  serializeMap(t) {
    let e = St$1, r = t.e.s, i = t.i, s = t.f, a = this.getRefParam(s.i);
    if (r) {
      let n = t.e.k, o = t.e.v;
      this.stack.push(i);
      let l = this.serializeMapEntry(i, n[0], o[0], a);
      for (let u = 1, d = l; u < r; u++)
        d = this.serializeMapEntry(i, n[u], o[u], a), l += (d && l && ",") + d;
      this.stack.pop(), l && (e += "([" + l + "])");
    }
    return s.t === 26 && (this.markRef(s.i), e = "(" + this.serialize(s) + "," + e + ")"), this.assignIndexedValue(i, e);
  }
  serializeArrayBuffer(t) {
    let e = "new Uint8Array(", r = t.s, i = r.length;
    if (i) {
      e += "[" + r[0];
      for (let s = 1; s < i; s++)
        e += "," + r[s];
      e += "]";
    }
    return this.assignIndexedValue(t.i, e + ").buffer");
  }
  serializeTypedArray(t) {
    return this.assignIndexedValue(t.i, "new " + t.c + "(" + this.serialize(t.f) + "," + t.b + "," + t.l + ")");
  }
  serializeDataView(t) {
    return this.assignIndexedValue(t.i, "new DataView(" + this.serialize(t.f) + "," + t.b + "," + t.l + ")");
  }
  serializeAggregateError(t) {
    let e = t.i;
    this.stack.push(e);
    let r = this.serializeDictionary(t, 'new AggregateError([],"' + t.m + '")');
    return this.stack.pop(), r;
  }
  serializeError(t) {
    return this.serializeDictionary(t, "new " + ee$1[t.s] + '("' + t.m + '")');
  }
  serializePromise(t) {
    let e, r = t.f, i = t.i, s = t.s ? Et$1 : It$1;
    if (this.isIndexedValueInStack(r)) {
      let a = this.getRefParam(r.i);
      e = s + (t.s ? "().then(" + this.createFunction([], a) + ")" : "().catch(" + this.createEffectfulFunction([], "throw " + a) + ")");
    } else {
      this.stack.push(i);
      let a = this.serialize(r);
      this.stack.pop(), e = s + "(" + a + ")";
    }
    return this.assignIndexedValue(i, e);
  }
  serializeWellKnownSymbol(t) {
    return this.assignIndexedValue(t.i, Ve[t.s]);
  }
  serializeBoxed(t) {
    return this.assignIndexedValue(t.i, "Object(" + this.serialize(t.f) + ")");
  }
  serializePlugin(t) {
    let e = this.plugins;
    if (e)
      for (let r = 0, i = e.length; r < i; r++) {
        let s = e[r];
        if (s.tag === t.c)
          return this.assignIndexedValue(t.i, s.serialize(t.s, this, { id: t.i }));
      }
    throw new Error('Missing plugin for tag "' + t.c + '".');
  }
  getConstructor(t) {
    let e = this.serialize(t);
    return e === this.getRefParam(t.i) ? e : "(" + e + ")";
  }
  serializePromiseConstructor(t) {
    return this.assignIndexedValue(t.i, this.getConstructor(t.f) + "()");
  }
  serializePromiseResolve(t) {
    return this.getConstructor(t.a[0]) + "(" + this.getRefParam(t.i) + "," + this.serialize(t.a[1]) + ")";
  }
  serializePromiseReject(t) {
    return this.getConstructor(t.a[0]) + "(" + this.getRefParam(t.i) + "," + this.serialize(t.a[1]) + ")";
  }
  serializeSpecialReferenceValue(t) {
    switch (t) {
      case 0:
        return "[]";
      case 1:
        return this.createFunction(["s", "f", "p"], "((p=new Promise(" + this.createEffectfulFunction(["a", "b"], "s=a,f=b") + ")).s=s,p.f=f,p)");
      case 2:
        return this.createEffectfulFunction(["p", "d"], 'p.s(d),p.status="success",p.value=d;delete p.s;delete p.f');
      case 3:
        return this.createEffectfulFunction(["p", "d"], 'p.f(d),p.status="failure",p.value=d;delete p.s;delete p.f');
      case 4:
        return this.createFunction(["b", "a", "s", "l", "p", "f", "e", "n"], "(b=[],a=!0,s=!1,l=[],p=0,f=" + this.createEffectfulFunction(["v", "m", "x"], "for(x=0;x<p;x++)l[x]&&l[x][m](v)") + ",n=" + this.createEffectfulFunction(["o", "x", "z", "c"], 'for(x=0,z=b.length;x<z;x++)(c=b[x],x===z-1?o[s?"return":"throw"](c):o.next(c))') + ",e=" + this.createFunction(["o", "t"], "(a&&(l[t=p++]=o),n(o)," + this.createEffectfulFunction([], "a&&(l[t]=void 0)") + ")") + ",{__SEROVAL_STREAM__:!0,on:" + this.createFunction(["o"], "e(o)") + ",next:" + this.createEffectfulFunction(["v"], 'a&&(b.push(v),f(v,"next"))') + ",throw:" + this.createEffectfulFunction(["v"], 'a&&(b.push(v),f(v,"throw"),a=s=!1,l.length=0)') + ",return:" + this.createEffectfulFunction(["v"], 'a&&(b.push(v),f(v,"return"),a=!1,s=!0,l.length=0)') + "})");
      default:
        return "";
    }
  }
  serializeSpecialReference(t) {
    return this.assignIndexedValue(t.i, this.serializeSpecialReferenceValue(t.s));
  }
  serializeIteratorFactory(t) {
    let e = "", r = false;
    return t.f.t !== 4 && (this.markRef(t.f.i), e = "(" + this.serialize(t.f) + ",", r = true), e += this.assignIndexedValue(t.i, this.createFunction(["s"], this.createFunction(["i", "c", "d", "t"], "(i=0,t={[" + this.getRefParam(t.f.i) + "]:" + this.createFunction([], "t") + ",next:" + this.createEffectfulFunction([], "if(i>s.d)return{done:!0,value:void 0};if(d=s.v[c=i++],c===s.t)throw d;return{done:c===s.d,value:d}") + "})"))), r && (e += ")"), e;
  }
  serializeIteratorFactoryInstance(t) {
    return this.getConstructor(t.a[0]) + "(" + this.serialize(t.a[1]) + ")";
  }
  serializeAsyncIteratorFactory(t) {
    let e = t.a[0], r = t.a[1], i = "";
    e.t !== 4 && (this.markRef(e.i), i += "(" + this.serialize(e)), r.t !== 4 && (this.markRef(r.i), i += (i ? "," : "(") + this.serialize(r)), i && (i += ",");
    let s = this.assignIndexedValue(t.i, this.createFunction(["s"], this.createFunction(["b", "c", "p", "d", "e", "t", "f"], "(b=[],c=0,p=[],d=-1,e=!1,f=" + this.createEffectfulFunction(["i", "l"], "for(i=0,l=p.length;i<l;i++)p[i].s({done:!0,value:void 0})") + ",s.on({next:" + this.createEffectfulFunction(["v", "t"], "if(t=p.shift())t.s({done:!1,value:v});b.push(v)") + ",throw:" + this.createEffectfulFunction(["v", "t"], "if(t=p.shift())t.f(v);f(),d=b.length,e=!0,b.push(v)") + ",return:" + this.createEffectfulFunction(["v", "t"], "if(t=p.shift())t.s({done:!0,value:v});f(),d=b.length,b.push(v)") + "}),t={[" + this.getRefParam(r.i) + "]:" + this.createFunction([], "t") + ",next:" + this.createEffectfulFunction(["i", "t", "v"], "if(d===-1){return((i=c++)>=b.length)?(p.push(t=" + this.getRefParam(e.i) + "()),t):{done:!0,value:b[i]}}if(c>d)return{done:!0,value:void 0};if(v=b[i=c++],i!==d)return{done:!1,value:v};if(e)throw v;return{done:!0,value:v}") + "})")));
    return i ? i + s + ")" : s;
  }
  serializeAsyncIteratorFactoryInstance(t) {
    return this.getConstructor(t.a[0]) + "(" + this.serialize(t.a[1]) + ")";
  }
  serializeStreamConstructor(t) {
    let e = this.assignIndexedValue(t.i, this.getConstructor(t.f) + "()"), r = t.a.length;
    if (r) {
      let i = this.serialize(t.a[0]);
      for (let s = 1; s < r; s++)
        i += "," + this.serialize(t.a[s]);
      return "(" + e + "," + i + "," + this.getRefParam(t.i) + ")";
    }
    return e;
  }
  serializeStreamNext(t) {
    return this.getRefParam(t.i) + ".next(" + this.serialize(t.f) + ")";
  }
  serializeStreamThrow(t) {
    return this.getRefParam(t.i) + ".throw(" + this.serialize(t.f) + ")";
  }
  serializeStreamReturn(t) {
    return this.getRefParam(t.i) + ".return(" + this.serialize(t.f) + ")";
  }
  serialize(t) {
    switch (t.t) {
      case 2:
        return je[t.s];
      case 0:
        return "" + t.s;
      case 1:
        return '"' + t.s + '"';
      case 3:
        return t.s + "n";
      case 4:
        return this.getRefParam(t.i);
      case 18:
        return this.serializeReference(t);
      case 9:
        return this.serializeArray(t);
      case 10:
        return this.serializeObject(t);
      case 11:
        return this.serializeNullConstructor(t);
      case 5:
        return this.serializeDate(t);
      case 6:
        return this.serializeRegExp(t);
      case 7:
        return this.serializeSet(t);
      case 8:
        return this.serializeMap(t);
      case 19:
        return this.serializeArrayBuffer(t);
      case 16:
      case 15:
        return this.serializeTypedArray(t);
      case 20:
        return this.serializeDataView(t);
      case 14:
        return this.serializeAggregateError(t);
      case 13:
        return this.serializeError(t);
      case 12:
        return this.serializePromise(t);
      case 17:
        return this.serializeWellKnownSymbol(t);
      case 21:
        return this.serializeBoxed(t);
      case 22:
        return this.serializePromiseConstructor(t);
      case 23:
        return this.serializePromiseResolve(t);
      case 24:
        return this.serializePromiseReject(t);
      case 25:
        return this.serializePlugin(t);
      case 26:
        return this.serializeSpecialReference(t);
      case 27:
        return this.serializeIteratorFactory(t);
      case 28:
        return this.serializeIteratorFactoryInstance(t);
      case 29:
        return this.serializeAsyncIteratorFactory(t);
      case 30:
        return this.serializeAsyncIteratorFactoryInstance(t);
      case 31:
        return this.serializeStreamConstructor(t);
      case 32:
        return this.serializeStreamNext(t);
      case 33:
        return this.serializeStreamThrow(t);
      case 34:
        return this.serializeStreamReturn(t);
      default:
        throw new Error("invariant");
    }
  }
}, xt$1 = class xt extends dt$1 {
  parseItems(e) {
    let r = [];
    for (let i = 0, s = e.length; i < s; i++)
      i in e && (r[i] = this.parse(e[i]));
    return r;
  }
  parseArray(e, r) {
    return Ge(e, r, this.parseItems(r));
  }
  parseProperties(e) {
    let r = Object.entries(e), i = [], s = [];
    for (let n = 0, o = r.length; n < o; n++)
      i.push(f(r[n][0])), s.push(this.parse(r[n][1]));
    let a = Symbol.iterator;
    return a in e && (i.push(this.parseWellKnownSymbol(a)), s.push(ie$1(this.parseIteratorFactory(), this.parse(ne(e))))), a = Symbol.asyncIterator, a in e && (i.push(this.parseWellKnownSymbol(a)), s.push(se(this.parseAsyncIteratorFactory(), this.parse(w())))), a = Symbol.toStringTag, a in e && (i.push(this.parseWellKnownSymbol(a)), s.push(T(e[a]))), a = Symbol.isConcatSpreadable, a in e && (i.push(this.parseWellKnownSymbol(a)), s.push(e[a] ? D : M)), { k: i, v: s, s: i.length };
  }
  parsePlainObject(e, r, i) {
    return this.createObjectNode(e, r, i, this.parseProperties(r));
  }
  parseBoxed(e, r) {
    return Qe(e, this.parse(r.valueOf()));
  }
  parseTypedArray(e, r) {
    return Xe(e, r, this.parse(r.buffer));
  }
  parseBigIntTypedArray(e, r) {
    return Ye(e, r, this.parse(r.buffer));
  }
  parseDataView(e, r) {
    return et(e, r, this.parse(r.buffer));
  }
  parseError(e, r) {
    let i = W(r, this.features);
    return tt(e, r, i ? this.parseProperties(i) : void 0);
  }
  parseAggregateError(e, r) {
    let i = W(r, this.features);
    return rt(e, r, i ? this.parseProperties(i) : void 0);
  }
  parseMap(e, r) {
    let i = [], s = [];
    for (let [a, n] of r.entries())
      i.push(this.parse(a)), s.push(this.parse(n));
    return this.createMapNode(e, i, s, r.size);
  }
  parseSet(e, r) {
    let i = [];
    for (let s of r.keys())
      i.push(this.parse(s));
    return it$1(e, r.size, i);
  }
  parsePlugin(e, r) {
    let i = this.plugins;
    if (i)
      for (let s = 0, a = i.length; s < a; s++) {
        let n = i[s];
        if (n.parse.sync && n.test(r))
          return re(e, n.tag, n.parse.sync(r, this, { id: e }));
      }
  }
  parseStream(e, r) {
    return ae$1(e, this.parseSpecialReference(4), []);
  }
  parsePromise(e, r) {
    return this.createPromiseConstructorNode(e);
  }
  parseObject(e, r) {
    if (Array.isArray(r))
      return this.parseArray(e, r);
    if (ht$1(r))
      return this.parseStream(e, r);
    let i = this.parsePlugin(e, r);
    if (i)
      return i;
    let s = r.constructor;
    switch (s) {
      case Object:
        return this.parsePlainObject(e, r, false);
      case void 0:
        return this.parsePlainObject(e, r, true);
      case Date:
        return Ke(e, r);
      case RegExp:
        return He(e, r);
      case Error:
      case EvalError:
      case RangeError:
      case ReferenceError:
      case SyntaxError:
      case TypeError:
      case URIError:
        return this.parseError(e, r);
      case Number:
      case Boolean:
      case String:
      case BigInt:
        return this.parseBoxed(e, r);
      case ArrayBuffer:
        return Ze(e, r);
      case Int8Array:
      case Int16Array:
      case Int32Array:
      case Uint8Array:
      case Uint16Array:
      case Uint32Array:
      case Uint8ClampedArray:
      case Float32Array:
      case Float64Array:
        return this.parseTypedArray(e, r);
      case DataView:
        return this.parseDataView(e, r);
      case Map:
        return this.parseMap(e, r);
      case Set:
        return this.parseSet(e, r);
    }
    if (s === Promise || r instanceof Promise)
      return this.parsePromise(e, r);
    let a = this.features;
    if (a & 16)
      switch (s) {
        case BigInt64Array:
        case BigUint64Array:
          return this.parseBigIntTypedArray(e, r);
      }
    if (a & 1 && typeof AggregateError < "u" && (s === AggregateError || r instanceof AggregateError))
      return this.parseAggregateError(e, r);
    if (r instanceof Error)
      return this.parseError(e, r);
    if (Symbol.iterator in r || Symbol.asyncIterator in r)
      return this.parsePlainObject(e, r, !!s);
    throw new _(r);
  }
  parse(e) {
    switch (typeof e) {
      case "boolean":
        return e ? D : M;
      case "undefined":
        return Me;
      case "string":
        return T(e);
      case "number":
        return Ne(e);
      case "bigint":
        return Le(e);
      case "object": {
        if (e) {
          let r = this.getReference(e);
          return r.type === 0 ? this.parseObject(r.value, e) : r.value;
        }
        return Te$1;
      }
      case "symbol":
        return this.parseWellKnownSymbol(e);
      case "function":
        return this.parseFunction(e);
      default:
        throw new _(e);
    }
  }
};
function Pt$1(t, e = {}) {
  let r = Y$1(e.plugins);
  return new mt$1({ plugins: r, markedRefs: t.m }).deserialize(t.t);
}
var kt$1 = class kt extends Rt$1 {
  constructor(t) {
    super(t), this.mode = "cross", this.scopeId = t.scopeId;
  }
  getRefParam(t) {
    return I + "[" + t + "]";
  }
  assignIndexedValue(t, e) {
    return this.getRefParam(t) + "=" + e;
  }
  serializeTop(t) {
    let e = this.serialize(t), r = t.i;
    if (r == null)
      return e;
    let i = this.resolvePatches(), s = this.getRefParam(r), a = this.scopeId == null ? "" : I, n = i ? e + "," + i + s : e;
    if (a === "")
      return i ? "(" + n + ")" : n;
    let o = this.scopeId == null ? "()" : "(" + I + '["' + f(this.scopeId) + '"])';
    return "(" + this.createFunction([a], n) + ")" + o;
  }
}, Ft$1 = class Ft extends xt$1 {
  constructor(t) {
    super(t), this.alive = true, this.pending = 0, this.initial = true, this.buffer = [], this.onParseCallback = t.onParse, this.onErrorCallback = t.onError, this.onDoneCallback = t.onDone;
  }
  onParseInternal(t, e) {
    try {
      this.onParseCallback(t, e);
    } catch (r) {
      this.onError(r);
    }
  }
  flush() {
    for (let t = 0, e = this.buffer.length; t < e; t++)
      this.onParseInternal(this.buffer[t], false);
  }
  onParse(t) {
    this.initial ? this.buffer.push(t) : this.onParseInternal(t, false);
  }
  onError(t) {
    if (this.onErrorCallback)
      this.onErrorCallback(t);
    else
      throw t;
  }
  onDone() {
    this.onDoneCallback && this.onDoneCallback();
  }
  pushPendingState() {
    this.pending++;
  }
  popPendingState() {
    --this.pending <= 0 && this.onDone();
  }
  parseProperties(t) {
    let e = Object.entries(t), r = [], i = [];
    for (let a = 0, n = e.length; a < n; a++)
      r.push(f(e[a][0])), i.push(this.parse(e[a][1]));
    let s = Symbol.iterator;
    return s in t && (r.push(this.parseWellKnownSymbol(s)), i.push(ie$1(this.parseIteratorFactory(), this.parse(ne(t))))), s = Symbol.asyncIterator, s in t && (r.push(this.parseWellKnownSymbol(s)), i.push(se(this.parseAsyncIteratorFactory(), this.parse(ft$1(t))))), s = Symbol.toStringTag, s in t && (r.push(this.parseWellKnownSymbol(s)), i.push(T(t[s]))), s = Symbol.isConcatSpreadable, s in t && (r.push(this.parseWellKnownSymbol(s)), i.push(t[s] ? D : M)), { k: r, v: i, s: r.length };
  }
  parsePromise(t, e) {
    return e.then((r) => {
      let i = this.parseWithError(r);
      i && this.onParse({ t: 23, i: t, s: void 0, l: void 0, c: void 0, m: void 0, p: void 0, e: void 0, a: [this.parseSpecialReference(2), i], f: void 0, b: void 0, o: void 0 }), this.popPendingState();
    }, (r) => {
      if (this.alive) {
        let i = this.parseWithError(r);
        i && this.onParse({ t: 24, i: t, s: void 0, l: void 0, c: void 0, m: void 0, p: void 0, e: void 0, a: [this.parseSpecialReference(3), i], f: void 0, b: void 0, o: void 0 });
      }
      this.popPendingState();
    }), this.pushPendingState(), this.createPromiseConstructorNode(t);
  }
  parsePlugin(t, e) {
    let r = this.plugins;
    if (r)
      for (let i = 0, s = r.length; i < s; i++) {
        let a = r[i];
        if (a.parse.stream && a.test(e))
          return re(t, a.tag, a.parse.stream(e, this, { id: t }));
      }
  }
  parseStream(t, e) {
    let r = ae$1(t, this.parseSpecialReference(4), []);
    return this.pushPendingState(), e.on({ next: (i) => {
      if (this.alive) {
        let s = this.parseWithError(i);
        s && this.onParse(st(t, s));
      }
    }, throw: (i) => {
      if (this.alive) {
        let s = this.parseWithError(i);
        s && this.onParse(at$1(t, s));
      }
      this.popPendingState();
    }, return: (i) => {
      if (this.alive) {
        let s = this.parseWithError(i);
        s && this.onParse(nt(t, s));
      }
      this.popPendingState();
    } }), r;
  }
  parseWithError(t) {
    try {
      return this.parse(t);
    } catch (e) {
      this.onError(e);
      return;
    }
  }
  start(t) {
    let e = this.parseWithError(t);
    e && (this.onParseInternal(e, true), this.initial = false, this.flush(), this.pending <= 0 && this.destroy());
  }
  destroy() {
    this.alive && (this.onDone(), this.alive = false);
  }
  isAlive() {
    return this.alive;
  }
}, Vt$1 = class Vt extends Ft$1 {
  constructor() {
    super(...arguments), this.mode = "cross";
  }
};
function Ot$1(t, e) {
  let r = Y$1(e.plugins), i = new Vt$1({ plugins: r, refs: e.refs, disabledFeatures: e.disabledFeatures, onParse(s, a) {
    let n = new kt$1({ plugins: r, features: i.features, scopeId: e.scopeId, markedRefs: i.marked }), o;
    try {
      o = n.serializeTop(s);
    } catch (l) {
      e.onError && e.onError(l);
      return;
    }
    e.onSerialize(o, a);
  }, onError: e.onError, onDone: e.onDone });
  return i.start(t), () => {
    i.destroy();
  };
}
function P(t) {
  return { detail: t.detail, bubbles: t.bubbles, cancelable: t.cancelable, composed: t.composed };
}
var jt$1 = { tag: "seroval-plugins/web/CustomEvent", test(t) {
  return typeof CustomEvent > "u" ? false : t instanceof CustomEvent;
}, parse: { sync(t, e) {
  return { type: e.parse(t.type), options: e.parse(P(t)) };
}, async async(t, e) {
  return { type: await e.parse(t.type), options: await e.parse(P(t)) };
}, stream(t, e) {
  return { type: e.parse(t.type), options: e.parse(P(t)) };
} }, serialize(t, e) {
  return "new CustomEvent(" + e.serialize(t.type) + "," + e.serialize(t.options) + ")";
}, deserialize(t, e) {
  return new CustomEvent(e.deserialize(t.type), e.deserialize(t.options));
} }, oe$1 = jt$1, Ct$1 = { tag: "seroval-plugins/web/DOMException", test(t) {
  return typeof DOMException > "u" ? false : t instanceof DOMException;
}, parse: { sync(t, e) {
  return { name: e.parse(t.name), message: e.parse(t.message) };
}, async async(t, e) {
  return { name: await e.parse(t.name), message: await e.parse(t.message) };
}, stream(t, e) {
  return { name: e.parse(t.name), message: e.parse(t.message) };
} }, serialize(t, e) {
  return "new DOMException(" + e.serialize(t.message) + "," + e.serialize(t.name) + ")";
}, deserialize(t, e) {
  return new DOMException(e.deserialize(t.message), e.deserialize(t.name));
} }, le = Ct$1;
function k(t) {
  return { bubbles: t.bubbles, cancelable: t.cancelable, composed: t.composed };
}
var Dt$1 = { tag: "seroval-plugins/web/Event", test(t) {
  return typeof Event > "u" ? false : t instanceof Event;
}, parse: { sync(t, e) {
  return { type: e.parse(t.type), options: e.parse(k(t)) };
}, async async(t, e) {
  return { type: await e.parse(t.type), options: await e.parse(k(t)) };
}, stream(t, e) {
  return { type: e.parse(t.type), options: e.parse(k(t)) };
} }, serialize(t, e) {
  return "new Event(" + e.serialize(t.type) + "," + e.serialize(t.options) + ")";
}, deserialize(t, e) {
  return new Event(e.deserialize(t.type), e.deserialize(t.options));
} }, ue = Dt$1, Mt$1 = { tag: "seroval-plugins/web/File", test(t) {
  return typeof File > "u" ? false : t instanceof File;
}, parse: { async async(t, e) {
  return { name: await e.parse(t.name), options: await e.parse({ type: t.type, lastModified: t.lastModified }), buffer: await e.parse(await t.arrayBuffer()) };
} }, serialize(t, e) {
  return "new File([" + e.serialize(t.buffer) + "]," + e.serialize(t.name) + "," + e.serialize(t.options) + ")";
}, deserialize(t, e) {
  return new File([e.deserialize(t.buffer)], e.deserialize(t.name), e.deserialize(t.options));
} }, Tt$1 = Mt$1;
function F(t) {
  let e = [];
  return t.forEach((r, i) => {
    e.push([i, r]);
  }), e;
}
var b = {}, $t$1 = { tag: "seroval-plugins/web/FormDataFactory", test(t) {
  return t === b;
}, parse: { sync() {
}, async async() {
  return await Promise.resolve(void 0);
}, stream() {
} }, serialize(t, e) {
  return e.createEffectfulFunction(["e", "f", "i", "s", "t"], "f=new FormData;for(i=0,s=e.length;i<s;i++)f.append((t=e[i])[0],t[1]);return f");
}, deserialize() {
  return b;
} }, Ut$1 = { tag: "seroval-plugins/web/FormData", extends: [Tt$1, $t$1], test(t) {
  return typeof FormData > "u" ? false : t instanceof FormData;
}, parse: { sync(t, e) {
  return { factory: e.parse(b), entries: e.parse(F(t)) };
}, async async(t, e) {
  return { factory: await e.parse(b), entries: await e.parse(F(t)) };
}, stream(t, e) {
  return { factory: e.parse(b), entries: e.parse(F(t)) };
} }, serialize(t, e) {
  return "(" + e.serialize(t.factory) + ")(" + e.serialize(t.entries) + ")";
}, deserialize(t, e) {
  let r = new FormData(), i = e.deserialize(t.entries);
  for (let s = 0, a = i.length; s < a; s++) {
    let n = i[s];
    r.append(n[0], n[1]);
  }
  return r;
} }, ce = Ut$1;
function V(t) {
  let e = [];
  return t.forEach((r, i) => {
    e.push([i, r]);
  }), e;
}
var Bt$1 = { tag: "seroval-plugins/web/Headers", test(t) {
  return typeof Headers > "u" ? false : t instanceof Headers;
}, parse: { sync(t, e) {
  return e.parse(V(t));
}, async async(t, e) {
  return await e.parse(V(t));
}, stream(t, e) {
  return e.parse(V(t));
} }, serialize(t, e) {
  return "new Headers(" + e.serialize(t) + ")";
}, deserialize(t, e) {
  return new Headers(e.deserialize(t));
} }, R = Bt$1, z = {}, _t$1 = { tag: "seroval-plugins/web/ReadableStreamFactory", test(t) {
  return t === z;
}, parse: { sync() {
}, async async() {
  return await Promise.resolve(void 0);
}, stream() {
} }, serialize(t, e) {
  return e.createFunction(["d"], "new ReadableStream({start:" + e.createEffectfulFunction(["c"], "d.on({next:" + e.createEffectfulFunction(["v"], "c.enqueue(v)") + ",throw:" + e.createEffectfulFunction(["v"], "c.error(v)") + ",return:" + e.createEffectfulFunction([], "c.close()") + "})") + "})");
}, deserialize() {
  return z;
} };
function H$1(t) {
  let e = w(), r = t.getReader();
  async function i() {
    try {
      let s = await r.read();
      s.done ? e.return(s.value) : (e.next(s.value), await i());
    } catch (s) {
      e.throw(s);
    }
  }
  return i().catch(() => {
  }), e;
}
var Wt$1 = { tag: "seroval/plugins/web/ReadableStream", extends: [_t$1], test(t) {
  return typeof ReadableStream > "u" ? false : t instanceof ReadableStream;
}, parse: { sync(t, e) {
  return { factory: e.parse(z), stream: e.parse(w()) };
}, async async(t, e) {
  return { factory: await e.parse(z), stream: await e.parse(H$1(t)) };
}, stream(t, e) {
  return { factory: e.parse(z), stream: e.parse(H$1(t)) };
} }, serialize(t, e) {
  return "(" + e.serialize(t.factory) + ")(" + e.serialize(t.stream) + ")";
}, deserialize(t, e) {
  let r = e.deserialize(t.stream);
  return new ReadableStream({ start(i) {
    r.on({ next(s) {
      i.enqueue(s);
    }, throw(s) {
      i.error(s);
    }, return() {
      i.close();
    } });
  } });
} }, x = Wt$1;
function Z(t, e) {
  return { body: e, cache: t.cache, credentials: t.credentials, headers: t.headers, integrity: t.integrity, keepalive: t.keepalive, method: t.method, mode: t.mode, redirect: t.redirect, referrer: t.referrer, referrerPolicy: t.referrerPolicy };
}
var Nt$1 = { tag: "seroval-plugins/web/Request", extends: [x, R], test(t) {
  return typeof Request > "u" ? false : t instanceof Request;
}, parse: { async async(t, e) {
  return { url: await e.parse(t.url), options: await e.parse(Z(t, t.body ? await t.clone().arrayBuffer() : null)) };
}, stream(t, e) {
  return { url: e.parse(t.url), options: e.parse(Z(t, t.clone().body)) };
} }, serialize(t, e) {
  return "new Request(" + e.serialize(t.url) + "," + e.serialize(t.options) + ")";
}, deserialize(t, e) {
  return new Request(e.deserialize(t.url), e.deserialize(t.options));
} }, de = Nt$1;
function J$1(t) {
  return { headers: t.headers, status: t.status, statusText: t.statusText };
}
var Lt$1 = { tag: "seroval-plugins/web/Response", extends: [x, R], test(t) {
  return typeof Response > "u" ? false : t instanceof Response;
}, parse: { async async(t, e) {
  return { body: await e.parse(t.body ? await t.clone().arrayBuffer() : null), options: await e.parse(J$1(t)) };
}, stream(t, e) {
  return { body: e.parse(t.clone().body), options: e.parse(J$1(t)) };
} }, serialize(t, e) {
  return "new Response(" + e.serialize(t.body) + "," + e.serialize(t.options) + ")";
}, deserialize(t, e) {
  return new Response(e.deserialize(t.body), e.deserialize(t.options));
} }, he = Lt$1, qt$1 = { tag: "seroval-plugins/web/URLSearchParams", test(t) {
  return typeof URLSearchParams > "u" ? false : t instanceof URLSearchParams;
}, parse: { sync(t, e) {
  return e.parse(t.toString());
}, async async(t, e) {
  return await e.parse(t.toString());
}, stream(t, e) {
  return e.parse(t.toString());
} }, serialize(t, e) {
  return "new URLSearchParams(" + e.serialize(t) + ")";
}, deserialize(t, e) {
  return new URLSearchParams(e.deserialize(t));
} }, fe = qt$1, Kt$1 = { tag: "seroval-plugins/web/URL", test(t) {
  return typeof URL > "u" ? false : t instanceof URL;
}, parse: { sync(t, e) {
  return e.parse(t.href);
}, async async(t, e) {
  return await e.parse(t.href);
}, stream(t, e) {
  return e.parse(t.href);
} }, serialize(t, e) {
  return "new URL(" + e.serialize(t) + ")";
}, deserialize(t, e) {
  return new URL(e.deserialize(t));
} }, pe$1 = Kt$1;
const O = "Invariant Violation", { setPrototypeOf: Ht$1 = function(t, e) {
  return t.__proto__ = e, t;
} } = Object;
let B$1 = class B extends Error {
  constructor(e = O) {
    super(typeof e == "number" ? `${O}: ${e} (see https://github.com/apollographql/invariant-packages)` : e);
    __publicField(this, "framesToPop", 1);
    __publicField(this, "name", O);
    Ht$1(this, B.prototype);
  }
};
function G(t, e) {
  if (!t)
    throw new B$1(e);
}
const ve$1 = Symbol("h3Event"), A = Symbol("fetchEvent"), Zt$1 = { get(t, e) {
  var _a;
  return e === A ? t : (_a = t[e]) != null ? _a : t[ve$1][e];
} };
function Jt$1(t) {
  return new Proxy({ request: toWebRequest(t), clientAddress: getRequestIP(t), locals: {}, [ve$1]: t }, Zt$1);
}
function Gt$1(t) {
  if (!t[A]) {
    const e = Jt$1(t);
    t[A] = e;
  }
  return t[A];
}
function Qt$1(t, e) {
  return new ReadableStream({ start(r) {
    Ot$1(e, { scopeId: t, plugins: [oe$1, le, ue, ce, R, x, de, he, fe, pe$1], onSerialize(i, s) {
      const a = s ? `(${Re$1(t)},${i})` : i;
      r.enqueue(new TextEncoder().encode(`${a};
`));
    }, onDone() {
      r.close();
    }, onError(i) {
      r.error(i);
    } });
  } });
}
async function Xt$1(t) {
  G(t.method === "POST", `Invalid method ${t.method}. Expected POST.`);
  const e = Gt$1(t), r = e.request, i = r.headers.get("x-server-id"), s = r.headers.get("x-server-instance"), a = new URL(r.url);
  let n, o;
  if (i)
    G(typeof i == "string", "Invalid server function"), [n, o] = i.split("#");
  else if (n = a.searchParams.get("id"), o = a.searchParams.get("name"), !n || !o)
    throw new Error("Invalid request");
  const l = (await globalThis.MANIFEST["server-fns"].chunks[n].import())[o];
  let u = [];
  if (!s) {
    const c = a.searchParams.get("args");
    c && JSON.parse(c).forEach((S) => u.push(S));
  }
  const d = r.headers.get("content-type");
  d.startsWith("multipart/form-data") || d.startsWith("application/x-www-form-urlencoded") ? u.push(await r.formData()) : u = Pt$1(await r.json(), { plugins: [oe$1, le, ue, ce, R, x, de, he, fe, pe$1] });
  try {
    const c = await provideRequestEvent(e, () => (sharedConfig.context = { event: e }, l(...u)));
    if (!s) {
      const S = c instanceof Error, ge = new URL(r.headers.get("referer"));
      return new Response(null, { status: 302, headers: { Location: ge.toString(), ...c ? { "Set-Cookie": `flash=${JSON.stringify({ url: a.pathname + encodeURIComponent(a.search), result: S ? c.message : c, error: S, input: [...u.slice(0, -1), [...u[u.length - 1].entries()]] })}; Secure; HttpOnly;` } : {} } });
    }
    return typeof c == "string" ? new Response(c) : (setHeader(t, "content-type", "text/javascript"), Qt$1(s, c));
  } catch (c) {
    return c instanceof Response && c.status === 302 ? new Response(null, { status: s ? 204 : 302, headers: { Location: c.headers.get("Location") } }) : c;
  }
}
const nr = eventHandler(Xt$1);

const pe = createContext(), ge = ["title", "meta"], X = [], Y = ["name", "http-equiv", "content", "charset", "media"].concat(["property"]), U = (e, t) => {
  const n = Object.fromEntries(Object.entries(e.props).filter(([r]) => t.includes(r)).sort());
  return (Object.hasOwn(n, "name") || Object.hasOwn(n, "property")) && (n.name = n.name || n.property, delete n.property), e.tag + JSON.stringify(n);
};
function ot() {
  if (!sharedConfig.context) {
    const n = document.head.querySelectorAll("[data-sm]");
    Array.prototype.forEach.call(n, (r) => r.parentNode.removeChild(r));
  }
  const e = /* @__PURE__ */ new Map();
  function t(n) {
    if (n.ref)
      return n.ref;
    let r = document.querySelector(`[data-sm="${n.id}"]`);
    return r ? (r.tagName.toLowerCase() !== n.tag && (r.parentNode && r.parentNode.removeChild(r), r = document.createElement(n.tag)), r.removeAttribute("data-sm")) : r = document.createElement(n.tag), r;
  }
  return { addTag(n) {
    if (ge.indexOf(n.tag) !== -1) {
      const o = n.tag === "title" ? X : Y, a = U(n, o);
      e.has(a) || e.set(a, []);
      let i = e.get(a), c = i.length;
      i = [...i, n], e.set(a, i);
      let l = t(n);
      n.ref = l, spread(l, n.props);
      let d = null;
      for (var r = c - 1; r >= 0; r--)
        if (i[r] != null) {
          d = i[r];
          break;
        }
      return l.parentNode != document.head && document.head.appendChild(l), d && d.ref && document.head.removeChild(d.ref), c;
    }
    let s = t(n);
    return n.ref = s, spread(s, n.props), s.parentNode != document.head && document.head.appendChild(s), -1;
  }, removeTag(n, r) {
    const s = n.tag === "title" ? X : Y, o = U(n, s);
    if (n.ref) {
      const a = e.get(o);
      if (a) {
        if (n.ref.parentNode) {
          n.ref.parentNode.removeChild(n.ref);
          for (let i = r - 1; i >= 0; i--)
            a[i] != null && document.head.appendChild(a[i].ref);
        }
        a[r] = null, e.set(o, a);
      } else
        n.ref.parentNode && n.ref.parentNode.removeChild(n.ref);
    }
  } };
}
function at() {
  const e = [];
  return useAssets(() => ssr(ut(e))), { addTag(t) {
    if (ge.indexOf(t.tag) !== -1) {
      const n = t.tag === "title" ? X : Y, r = U(t, n), s = e.findIndex((o) => o.tag === t.tag && U(o, n) === r);
      s !== -1 && e.splice(s, 1);
    }
    return e.push(t), e.length;
  }, removeTag(t, n) {
  } };
}
const it = (e) => {
  const t = isServer ? at() : ot();
  return createComponent(pe.Provider, { value: t, get children() {
    return e.children;
  } });
}, ct = (e, t, n) => (lt({ tag: e, props: t, setting: n, id: createUniqueId(), get name() {
  return t.name || t.property;
} }), null);
function lt(e) {
  const t = useContext(pe);
  if (!t)
    throw new Error("<MetaProvider /> should be in the tree");
  createRenderEffect(() => {
    const n = t.addTag(e);
    onCleanup(() => t.removeTag(e, n));
  });
}
function ut(e) {
  return e.map((t) => {
    var _a, _b;
    const r = Object.keys(t.props).map((o) => o === "children" ? "" : ` ${o}="${escape(t.props[o], true)}"`).join(""), s = t.props.children;
    return ((_a = t.setting) == null ? void 0 : _a.close) ? `<${t.tag} data-sm="${t.id}"${r}>${((_b = t.setting) == null ? void 0 : _b.escape) ? escape(s) : s || ""}</${t.tag}>` : `<${t.tag} data-sm="${t.id}"${r}/>`;
  }).join("");
}
const dt = (e) => ct("title", e, { escape: true, close: true });
function ht() {
  let e = /* @__PURE__ */ new Set();
  function t(s) {
    return e.add(s), () => e.delete(s);
  }
  let n = false;
  function r(s, o) {
    if (n)
      return !(n = false);
    const a = { to: s, options: o, defaultPrevented: false, preventDefault: () => a.defaultPrevented = true };
    for (const i of e)
      i.listener({ ...a, from: i.location, retry: (c) => {
        c && (n = true), i.navigate(s, { ...o, resolve: false });
      } });
    return !a.defaultPrevented;
  }
  return { subscribe: t, confirm: r };
}
const ft = /^(?:[a-z0-9]+:)?\/\//i, mt = /^\/+|(\/)\/+$/g;
function N(e, t = false) {
  const n = e.replace(mt, "$1");
  return n ? t || /^[?#]/.test(n) ? n : "/" + n : "";
}
function B(e, t, n) {
  if (ft.test(t))
    return;
  const r = N(e), s = n && N(n);
  let o = "";
  return !s || t.startsWith("/") ? o = r : s.toLowerCase().indexOf(r.toLowerCase()) !== 0 ? o = r + s : o = s, (o || "/") + N(t, !o);
}
function pt(e, t) {
  return N(e).replace(/\/*(\*.*)?$/g, "") + N(t);
}
function ye(e) {
  const t = {};
  return e.searchParams.forEach((n, r) => {
    t[r] = n;
  }), t;
}
function gt(e, t, n) {
  const [r, s] = e.split("/*", 2), o = r.split("/").filter(Boolean), a = o.length;
  return (i) => {
    const c = i.split("/").filter(Boolean), l = c.length - a;
    if (l < 0 || l > 0 && s === void 0 && !t)
      return null;
    const d = { path: a ? "" : "/", params: {} }, h = (v) => n === void 0 ? void 0 : n[v];
    for (let v = 0; v < a; v++) {
      const b = o[v], f = c[v], u = b[0] === ":", p = u ? b.slice(1) : b;
      if (u && J(f, h(p)))
        d.params[p] = f;
      else if (u || !J(f, b))
        return null;
      d.path += `/${f}`;
    }
    if (s) {
      const v = l ? c.slice(-l).join("/") : "";
      if (J(v, h(s)))
        d.params[s] = v;
      else
        return null;
    }
    return d;
  };
}
function J(e, t) {
  const n = (r) => r.localeCompare(e, void 0, { sensitivity: "base" }) === 0;
  return t === void 0 ? true : typeof t == "string" ? n(t) : typeof t == "function" ? t(e) : Array.isArray(t) ? t.some(n) : t instanceof RegExp ? t.test(e) : false;
}
function yt(e) {
  const [t, n] = e.pattern.split("/*", 2), r = t.split("/").filter(Boolean);
  return r.reduce((s, o) => s + (o.startsWith(":") ? 2 : 3), r.length - (n === void 0 ? 0 : 1));
}
function ve(e) {
  const t = /* @__PURE__ */ new Map(), n = getOwner();
  return new Proxy({}, { get(r, s) {
    return t.has(s) || runWithOwner(n, () => t.set(s, createMemo(() => e()[s]))), t.get(s)();
  }, getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true };
  }, ownKeys() {
    return Reflect.ownKeys(e());
  } });
}
function we(e) {
  let t = /(\/?\:[^\/]+)\?/.exec(e);
  if (!t)
    return [e];
  let n = e.slice(0, t.index), r = e.slice(t.index + t[0].length);
  const s = [n, n += t[1]];
  for (; t = /^(\/\:[^\/]+)\?/.exec(r); )
    s.push(n += t[1]), r = r.slice(t[0].length);
  return we(r).reduce((o, a) => [...o, ...s.map((i) => i + a)], []);
}
const vt = 100, wt = createContext(), ee = createContext();
function bt(e, t = "") {
  const { component: n, load: r, children: s, metadata: o } = e, a = !s || Array.isArray(s) && !s.length, i = { key: e, component: n, load: r, metadata: o };
  return be(e.path).reduce((c, l) => {
    for (const d of we(l)) {
      const h = pt(t, d), v = a ? h : h.split("/*", 1)[0];
      c.push({ ...i, originalPath: d, pattern: v, matcher: gt(v, !a, e.matchFilters) });
    }
    return c;
  }, []);
}
function Rt(e, t = 0) {
  return { routes: e, score: yt(e[e.length - 1]) * 1e4 - t, matcher(n) {
    const r = [];
    for (let s = e.length - 1; s >= 0; s--) {
      const o = e[s], a = o.matcher(n);
      if (!a)
        return null;
      r.unshift({ ...a, route: o });
    }
    return r;
  } };
}
function be(e) {
  return Array.isArray(e) ? e : [e];
}
function Re(e, t = "", n = [], r = []) {
  const s = be(e);
  for (let o = 0, a = s.length; o < a; o++) {
    const i = s[o];
    if (i && typeof i == "object") {
      i.hasOwnProperty("path") || (i.path = "");
      const c = bt(i, t);
      for (const l of c) {
        n.push(l);
        const d = Array.isArray(i.children) && i.children.length === 0;
        if (i.children && !d)
          Re(i.children, l.pattern, n, r);
        else {
          const h = Rt([...n], r.length);
          r.push(h);
        }
        n.pop();
      }
    }
  }
  return n.length ? r : r.sort((o, a) => a.score - o.score);
}
function Se(e, t) {
  for (let n = 0, r = e.length; n < r; n++) {
    const s = e[n].matcher(t);
    if (s)
      return s;
  }
  return [];
}
function St(e, t) {
  const n = new URL("http://sar"), r = createMemo((c) => {
    const l = e();
    try {
      return new URL(l, n);
    } catch {
      return console.error(`Invalid path ${l}`), c;
    }
  }, n, { equals: (c, l) => c.href === l.href }), s = createMemo(() => r().pathname), o = createMemo(() => r().search, true), a = createMemo(() => r().hash), i = () => "";
  return { get pathname() {
    return s();
  }, get search() {
    return o();
  }, get hash() {
    return a();
  }, get state() {
    return t();
  }, get key() {
    return i();
  }, query: ve(on$1(o, () => ye(r()))) };
}
let $;
function Et(e, t, n = {}) {
  const { signal: [r, s], utils: o = {} } = e, a = o.parsePath || ((m) => m), i = o.renderPath || ((m) => m), c = o.beforeLeave || ht(), l = B("", n.base || "");
  if (l === void 0)
    throw new Error(`${l} is not a valid base path`);
  l && !r().value && s({ value: l, replace: true, scroll: false });
  const [d, h] = createSignal(false), v = async (m) => {
    h(true);
    try {
      await startTransition(m);
    } finally {
      h(false);
    }
  }, [b, f] = createSignal(r().value), [u, p] = createSignal(r().state), g = St(b, u), E = [], R = createSignal(isServer ? ke() : []), C = { pattern: l, params: {}, path: () => l, outlet: () => null, resolvePath(m) {
    return B(l, m);
  } };
  return createRenderEffect(() => {
    const { value: m, state: w } = r();
    untrack(() => {
      m !== b() && v(() => {
        $ = "native", f(m), p(w), resetErrorBoundaries(), R[1]([]);
      }).then(() => {
        $ = void 0;
      });
    });
  }), { base: C, location: g, isRouting: d, renderPath: i, parsePath: a, navigatorFactory: xe, beforeLeave: c, preloadRoute: Oe, submissions: R };
  function j(m, w, P) {
    untrack(() => {
      if (typeof w == "number") {
        w && (o.go ? c.confirm(w, P) && o.go(w) : console.warn("Router integration does not support relative routing"));
        return;
      }
      const { replace: F, resolve: _, scroll: A, state: M } = { replace: false, resolve: true, scroll: true, ...P }, T = _ ? m.resolvePath(w) : B("", w);
      if (T === void 0)
        throw new Error(`Path '${w}' is not a routable path`);
      if (E.length >= vt)
        throw new Error("Too many redirects");
      const te = b();
      if (T !== te || M !== u()) {
        if (isServer) {
          const I = getRequestEvent();
          I && (I.response = new Response(null, { status: 302, headers: { Location: T } })), s({ value: T, replace: F, scroll: A, state: M });
        } else if (c.confirm(T, P)) {
          const I = E.push({ value: te, replace: F, scroll: A, state: u() });
          v(() => {
            $ = "navigate", f(T), p(M), resetErrorBoundaries(), R[1]([]);
          }).then(() => {
            E.length === I && ($ = void 0, Le({ value: T, state: M }));
          });
        }
      }
    });
  }
  function xe(m) {
    return m = m || useContext(ee) || C, (w, P) => j(m, w, P);
  }
  function Le(m) {
    const w = E[0];
    w && ((m.value !== w.value || m.state !== w.state) && s({ ...m, replace: w.replace, scroll: w.scroll }), E.length = 0);
  }
  function Oe(m, w) {
    const P = Se(t(), m.pathname), F = $;
    $ = "preload";
    for (let _ in P) {
      const { route: A, params: M } = P[_];
      A.component && A.component.preload && A.component.preload(), w && A.load && A.load({ params: M, location: { pathname: m.pathname, search: m.search, hash: m.hash, query: ye(m), state: null, key: "" }, intent: "preload" });
    }
    $ = F;
  }
  function ke() {
    const m = getRequestEvent();
    return m && m.initialSubmission ? [m.initialSubmission] : [];
  }
}
function Pt(e, t, n, r, s) {
  const { base: o, location: a } = e, { pattern: i, component: c, load: l } = r().route, d = createMemo(() => r().path);
  c && c.preload && c.preload();
  const h = l ? l({ params: s, location: a, intent: $ || "initial" }) : void 0;
  return { parent: t, pattern: i, path: d, params: s, outlet: () => c ? createComponent$1(c, { params: s, location: a, data: h, get children() {
    return n();
  } }) : n(), resolvePath(b) {
    return B(o.path(), b, d());
  } };
}
const Ee = (e) => (t) => {
  const { base: n } = t, r = children(() => t.children), s = createMemo(() => Re(t.root ? { component: t.root, children: r() } : r(), t.base || "")), o = Et(e, s, { base: n });
  return e.create && e.create(o), createComponent(wt.Provider, { value: o, get children() {
    return createComponent(At, { routerState: o, get branches() {
      return s();
    } });
  } });
};
function At(e) {
  const t = createMemo(() => Se(e.branches, e.routerState.location.pathname));
  if (isServer) {
    const a = getRequestEvent();
    a && (a.routerMatches || (a.routerMatches = [])).push(t().map(({ route: i, path: c, params: l }) => ({ path: i.originalPath, pattern: i.pattern, match: c, params: l, metadata: i.metadata })));
  }
  const n = ve(() => {
    const a = t(), i = {};
    for (let c = 0; c < a.length; c++)
      Object.assign(i, a[c].params);
    return i;
  }), r = [];
  let s;
  const o = createMemo(on$1(t, (a, i, c) => {
    let l = i && a.length === i.length;
    const d = [];
    for (let h = 0, v = a.length; h < v; h++) {
      const b = i && i[h], f = a[h];
      c && b && f.route.key === b.route.key ? d[h] = c[h] : (l = false, r[h] && r[h](), createRoot((u) => {
        r[h] = u, d[h] = Pt(e.routerState, d[h - 1] || e.routerState.base, $t(() => o()[h + 1]), () => t()[h], n);
      }));
    }
    return r.splice(a.length).forEach((h) => h()), c && l ? c : (s = d[0], d);
  }));
  return createComponent(Show, { get when() {
    return o() && s;
  }, keyed: true, children: (a) => createComponent(ee.Provider, { value: a, get children() {
    return a.outlet();
  } }) });
}
const $t = (e) => () => createComponent(Show, { get when() {
  return e();
}, keyed: true, children: (t) => createComponent(ee.Provider, { value: t, get children() {
  return t.outlet();
} }) });
function Ct([e, t], n, r) {
  return [n ? () => n(e()) : e, r ? (s) => t(r(s)) : t];
}
function Tt(e) {
  if (e === "#")
    return null;
  try {
    return document.querySelector(e);
  } catch {
    return null;
  }
}
function xt(e) {
  let t = false;
  const n = (s) => typeof s == "string" ? { value: s } : s, r = Ct(createSignal(n(e.get()), { equals: (s, o) => s.value === o.value }), void 0, (s) => (!t && e.set(s), s));
  return e.init && onCleanup(e.init((s = e.get()) => {
    t = true, r[1](n(s)), t = false;
  })), Ee({ signal: r, create: e.create, utils: e.utils });
}
function Lt(e, t, n) {
  return e.addEventListener(t, n), () => e.removeEventListener(t, n);
}
function Ot(e, t) {
  const n = Tt(`#${e}`);
  n ? n.scrollIntoView() : t && window.scrollTo(0, 0);
}
function kt(e) {
  const t = new URL(e);
  return t.pathname + t.search;
}
function Mt(e) {
  let t;
  const n = { value: e.url || (t = getRequestEvent()) && kt(t.request.url) || "" };
  return Ee({ signal: [() => n, (r) => Object.assign(n, r)] })(e);
}
const qt = /* @__PURE__ */ new Map();
function Nt(e = true, t = false, n = "/_server") {
  return (r) => {
    const s = r.base.path(), o = r.navigatorFactory(r.base);
    let a = {};
    function i(f) {
      return f.namespaceURI === "http://www.w3.org/2000/svg";
    }
    function c(f) {
      if (f.defaultPrevented || f.button !== 0 || f.metaKey || f.altKey || f.ctrlKey || f.shiftKey)
        return;
      const u = f.composedPath().find((j) => j instanceof Node && j.nodeName.toUpperCase() === "A");
      if (!u || t && !u.getAttribute("link"))
        return;
      const p = i(u), g = p ? u.href.baseVal : u.href;
      if ((p ? u.target.baseVal : u.target) || !g && !u.hasAttribute("state"))
        return;
      const R = (u.getAttribute("rel") || "").split(/\s+/);
      if (u.hasAttribute("download") || R && R.includes("external"))
        return;
      const C = p ? new URL(g, document.baseURI) : new URL(g);
      if (!(C.origin !== window.location.origin || s && C.pathname && !C.pathname.toLowerCase().startsWith(s.toLowerCase())))
        return [u, C];
    }
    function l(f) {
      const u = c(f);
      if (!u)
        return;
      const [p, g] = u, E = r.parsePath(g.pathname + g.search + g.hash), R = p.getAttribute("state");
      f.preventDefault(), o(E, { resolve: false, replace: p.hasAttribute("replace"), scroll: !p.hasAttribute("noscroll"), state: R && JSON.parse(R) });
    }
    function d(f) {
      const u = c(f);
      if (!u)
        return;
      const [p, g] = u;
      a[g.pathname] || r.preloadRoute(g, p.getAttribute("preload") !== "false");
    }
    function h(f) {
      const u = c(f);
      if (!u)
        return;
      const [p, g] = u;
      a[g.pathname] || (a[g.pathname] = setTimeout(() => {
        r.preloadRoute(g, p.getAttribute("preload") !== "false"), delete a[g.pathname];
      }, 200));
    }
    function v(f) {
      const u = c(f);
      if (!u)
        return;
      const [, p] = u;
      a[p.pathname] && (clearTimeout(a[p.pathname]), delete a[p.pathname]);
    }
    function b(f) {
      let u = f.submitter && f.submitter.hasAttribute("formaction") ? f.submitter.formAction : f.target.action;
      if (!u)
        return;
      if (!u.startsWith("action:")) {
        const g = new URL(u);
        if (u = r.parsePath(g.pathname + g.search), !u.startsWith(n))
          return;
      }
      if (f.target.method.toUpperCase() !== "POST")
        throw new Error("Only POST forms are supported for Actions");
      const p = qt.get(u);
      if (p) {
        f.preventDefault();
        const g = new FormData(f.target);
        p.call(r, g);
      }
    }
    delegateEvents(["click", "submit"]), document.addEventListener("click", l), e && (document.addEventListener("mouseover", h), document.addEventListener("mouseout", v), document.addEventListener("focusin", d), document.addEventListener("touchstart", d)), document.addEventListener("submit", b), onCleanup(() => {
      document.removeEventListener("click", l), e && (document.removeEventListener("mouseover", h), document.removeEventListener("mouseout", v), document.removeEventListener("focusin", d), document.removeEventListener("touchstart", d)), document.removeEventListener("submit", b);
    });
  };
}
function jt(e) {
  return isServer ? Mt(e) : xt({ get: () => ({ value: window.location.pathname + window.location.search + window.location.hash, state: history.state }), set({ value: t, replace: n, scroll: r, state: s }) {
    n ? window.history.replaceState(s, "", t) : window.history.pushState(s, "", t), Ot(window.location.hash.slice(1), r);
  }, init: (t) => Lt(window, "popstate", () => t()), create: Nt(e.preload, e.explicitLinks, e.actionBase), utils: { go: (t) => window.history.go(t) } })(e);
}
const Ft = " ", It = { style: (e) => ssrElement("style", e.attrs, () => escape(e.children), true), link: (e) => ssrElement("link", e.attrs, void 0, true), script: (e) => e.attrs.src ? ssrElement("script", mergeProps(() => e.attrs, { get id() {
  return e.key;
} }), () => ssr(Ft), true) : null };
function Q(e) {
  let { tag: t, attrs: { key: n, ...r } = { key: void 0 }, children: s } = e;
  return It[t]({ attrs: r, key: n, children: s });
}
function Bt(e, t, n, r = "default") {
  return lazy(async () => {
    var _a;
    {
      const o = (await e.import())[r], i = (await ((_a = t.inputs) == null ? void 0 : _a[e.src].assets())).filter((l) => l.tag === "style" || l.attrs.rel === "stylesheet");
      return { default: (l) => [...i.map((d) => Q(d)), createComponent$1(o, l)] };
    }
  });
}
const Pe = [{ type: "page", $component: { src: "src/routes/index.tsx?pick=default&pick=$css", build: () => import('./chunks/build/index.mjs'), import: () => import('./chunks/build/index.mjs') }, path: "/", filePath: "/Users/brendonovich/github.com/brendonovich/macrograph/web-solid/src/routes/index.tsx" }], Ht = _t(Pe.filter((e) => e.type === "page")), Ut = Wt(Pe.filter((e) => e.type === "api"));
function Kt(e, t) {
  const n = e.split("/").filter(Boolean);
  e:
    for (const r of Ut) {
      const s = r.matchSegments;
      if (n.length < s.length || !r.wildcard && n.length > s.length)
        continue;
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c && n[i] !== c)
          continue e;
      }
      const o = r[`$${t}`];
      if (o === "skip" || o === void 0)
        return;
      const a = {};
      for (const { type: i, name: c, index: l } of r.params)
        i === ":" ? a[c] = n[l] : a[c] = n.slice(l).join("/");
      return { handler: o, params: a };
    }
}
function _t(e) {
  function t(n, r, s, o) {
    const a = Object.values(n).find((i) => s.startsWith(i.id + "/"));
    return a ? (t(a.children || (a.children = []), r, s.slice(a.id.length)), n) : (n.push({ ...r, id: s, path: s.replace(/\/\([^)/]+\)/g, "") }), n);
  }
  return e.sort((n, r) => n.path.length - r.path.length).reduce((n, r) => t(n, r, r.path, r.path), []);
}
function Wt(e) {
  return e.flatMap((t) => Ae(t.path).map((r) => ({ ...t, path: r }))).map(zt).sort((t, n) => n.score - t.score);
}
function Ae(e) {
  let t = /(\/?\:[^\/]+)\?/.exec(e);
  if (!t)
    return [e];
  let n = e.slice(0, t.index), r = e.slice(t.index + t[0].length);
  const s = [n, n += t[1]];
  for (; t = /^(\/\:[^\/]+)\?/.exec(r); )
    s.push(n += t[1]), r = r.slice(t[0].length);
  return Ae(r).reduce((o, a) => [...o, ...s.map((i) => i + a)], []);
}
function zt(e) {
  const t = e.path.split("/").filter(Boolean), n = [], r = [];
  let s = 0, o = false;
  for (const [a, i] of t.entries())
    if (i[0] === ":") {
      const c = i.slice(1);
      s += 3, n.push({ type: ":", name: c, index: a }), r.push(null);
    } else
      i[0] === "*" ? (s -= 1, n.push({ type: "*", name: i.slice(1), index: a }), o = true) : (s += 4, i.match(/^\(.+\)$/) || r.push(i));
  return { ...e, score: s, params: n, matchSegments: r, wildcard: o };
}
function $e() {
  function e(n) {
    return { ...n, ...n.$$route ? n.$$route.require().route : void 0, metadata: { ...n.$$route ? n.$$route.require().route.metadata : {}, filesystem: true }, component: Bt(n.$component, globalThis.MANIFEST.client, globalThis.MANIFEST.ssr), children: n.children ? n.children.map(e) : void 0 };
  }
  return Ht.map(e);
}
let oe;
const Jt = () => isServer ? getRequestEvent().routes : oe || (oe = $e());
function Dt(e) {
  if (isServer) {
    const t = getRequestEvent();
    t && onCleanup(t.components.status(e));
  }
  return null;
}
function Vt() {
  return createComponent(jt, { root: (e) => createComponent(it, { get children() {
    return [createComponent(dt, { children: "MacroGraph" }), createComponent(Suspense, { get children() {
      return e.children;
    } })];
  } }), get children() {
    return createComponent(Jt, {});
  } });
}
function Gt(e) {
  return createComponent(ErrorBoundary, { get fallback() {
    return createComponent(Dt, { code: 500 });
  }, get children() {
    return e.children;
  } });
}
const Xt = ["<script", ">", "<\/script>"], Yt = ["<script", ' type="module" async', "><\/script>"], Qt = ssr("<!DOCTYPE html>");
function Zt(e) {
  const t = getRequestEvent();
  let n = [];
  return Promise.resolve().then(async () => {
    let r = t.routes;
    if (t.routerMatches && t.routerMatches[0])
      for (let s = 0; s < t.routerMatches[0].length; s++) {
        const o = t.routerMatches[0][s];
        if (o.metadata && o.metadata.filesystem) {
          const a = r.find((l) => l.path === o.path), c = await globalThis.MANIFEST.client.inputs[a.$component.src].assets();
          n.push.apply(n, c), r = a.children;
        }
      }
    n = [...new Map(n.map((s) => [s.attrs.key, s])).values()].filter((s) => s.attrs.rel === "modulepreload" && !t.assets.find((o) => o.attrs.key === s.attrs.key));
  }), useAssets(() => n.length ? n.map((r) => Q(r)) : void 0), createComponent(NoHydration, { get children() {
    return [Qt, createComponent(e.document, { get assets() {
      return [createComponent(HydrationScript, {}), t.assets.map((r) => Q(r))];
    }, get scripts() {
      return [ssr(Xt, ssrHydrationKey(), `window.manifest = ${JSON.stringify(t.manifest)}`), ssr(Yt, ssrHydrationKey(), ssrAttribute("src", escape(globalThis.MANIFEST.client.inputs[globalThis.MANIFEST.client.handler].output.path, true), false))];
    }, get children() {
      return createComponent(Hydration, { get children() {
        return createComponent(Gt, { get children() {
          return createComponent(Vt, {});
        } });
      } });
    } })];
  } });
}
const Ce = Symbol("h3Event"), H = Symbol("fetchEvent"), en = { get(e, t) {
  var _a;
  return t === H ? e : (_a = e[t]) != null ? _a : e[Ce][t];
} };
function tn(e) {
  return new Proxy({ request: toWebRequest(e), clientAddress: getRequestIP(e), locals: {}, [Ce]: e }, en);
}
function nn(e) {
  if (!e[H]) {
    const t = tn(e);
    e[H] = t;
  }
  return e[H];
}
function rn(e) {
  const t = getCookie(e, "flash");
  if (!t)
    return;
  let n = JSON.parse(t);
  if (!n || !n.result)
    return [];
  const r = [...n.input.slice(0, -1), new Map(n.input[n.input.length - 1])];
  return setCookie(e, "flash", "", { maxAge: 0 }), { url: n.url, result: n.error ? new Error(n.result) : n.result, input: r };
}
async function Te(e) {
  const t = globalThis.MANIFEST.client;
  return globalThis.MANIFEST.ssr, setResponseHeader(e, "Content-Type", "text/html"), Object.assign(e, { manifest: await t.json(), assets: [...await t.inputs[t.handler].assets()], initialSubmission: rn(e), routes: $e(), components: { status: (r) => (setResponseStatus(e, r.code, r.text), () => setResponseStatus(e, 200)), header: (r) => (r.append ? appendResponseHeader(e, r.name, r.value) : setResponseHeader(e, r.name, r.value), () => {
    const s = getResponseHeader(e, r.name);
    if (s && typeof s == "string") {
      const o = s.split(", "), a = o.indexOf(r.value);
      a !== -1 && o.splice(a, 1), o.length ? setResponseHeader(e, r.name, o.join(", ")) : removeResponseHeader(e, r.name);
    }
  }) }, $islands: /* @__PURE__ */ new Set() });
}
function sn(e, t = {}) {
  return eventHandler({ onRequest: t.onRequest, onBeforeResponse: t.onBeforeResponse, handler: (n) => {
    const r = nn(n);
    return provideRequestEvent(r, async () => {
      const s = Kt(new URL(r.request.url).pathname, r.request.method);
      if (s) {
        const h = (await s.handler.import())[r.request.method];
        return r.params = s.params, sharedConfig.context = { event: r }, await h(r);
      }
      const o = await Te(r);
      let a = { ...t };
      if (a.onCompleteAll) {
        const d = a.onCompleteAll;
        a.onCompleteAll = (h) => {
          ie(o)(h), d(h);
        };
      } else
        a.onCompleteAll = ie(o);
      if (a.onCompleteShell) {
        const d = a.onCompleteShell;
        a.onCompleteShell = (h) => {
          ae(o, n)(), d(h);
        };
      } else
        a.onCompleteShell = ae(o, n);
      const i = renderToStream(() => (sharedConfig.context.event = o, e(o)), a);
      if (o.response && o.response.headers.get("Location"))
        return sendRedirect(r, o.response.headers.get("Location"));
      const { writable: c, readable: l } = new TransformStream();
      return i.pipeTo(c), l;
    });
  } });
}
function ae(e, t) {
  return () => {
    e.response && e.response.headers.get("Location") && (setResponseStatus(t, 302), setHeader(t, "Location", e.response.headers.get("Location")));
  };
}
function ie(e) {
  return ({ write: t }) => {
    const n = e.response && e.response.headers.get("Location");
    n && t(`<script>window.location="${n}"<\/script>`);
  };
}
function on(e, t = {}) {
  return sn(e, { ...t, createPageEvent: Te });
}
const an = ['<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="icon" href="/favicon.ico">', "</head>"], cn = ["<html", ' lang="en">', '<body><div id="app">', "</div><!--$-->", "<!--/--></body></html>"], fn = on(() => createComponent(Zt, { document: ({ assets: e, children: t, scripts: n }) => ssr(cn, ssrHydrationKey(), createComponent(NoHydration, { get children() {
  return ssr(an, escape(e));
} }), escape(t), escape(n)) }));

const handlers = [
  { route: '', handler: _f4b49z, lazy: false, middleware: true, method: undefined },
  { route: '/_server', handler: nr, lazy: false, middleware: true, method: undefined },
  { route: '/', handler: fn, lazy: false, middleware: true, method: undefined }
];

function createNitroApp() {
  const config = useRuntimeConfig();
  const hooks = createHooks();
  const captureError = (error, context = {}) => {
    const promise = hooks.callHookParallel("error", error, context).catch((_err) => {
      console.error("Error while capturing another error", _err);
    });
    if (context.event && isEvent(context.event)) {
      const errors = context.event.context.nitro?.errors;
      if (errors) {
        errors.push({ error, context });
      }
      if (context.event.waitUntil) {
        context.event.waitUntil(promise);
      }
    }
  };
  const h3App = createApp({
    debug: destr(false),
    onError: (error, event) => {
      captureError(error, { event, tags: ["request"] });
      return errorHandler(error, event);
    },
    onRequest: async (event) => {
      await nitroApp.hooks.callHook("request", event).catch((error) => {
        captureError(error, { event, tags: ["request"] });
      });
    },
    onBeforeResponse: async (event, response) => {
      await nitroApp.hooks.callHook("beforeResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    },
    onAfterResponse: async (event, response) => {
      await nitroApp.hooks.callHook("afterResponse", event, response).catch((error) => {
        captureError(error, { event, tags: ["request", "response"] });
      });
    }
  });
  const router = createRouter$1({
    preemptive: true
  });
  const localCall = createCall(toNodeListener(h3App));
  const _localFetch = createFetch(localCall, globalThis.fetch);
  const localFetch = (input, init) => _localFetch(input, init).then(
    (response) => normalizeFetchResponse(response)
  );
  const $fetch = createFetch$1({
    fetch: localFetch,
    Headers: Headers$1,
    defaults: { baseURL: config.app.baseURL }
  });
  globalThis.$fetch = $fetch;
  h3App.use(createRouteRulesHandler({ localFetch }));
  h3App.use(
    eventHandler((event) => {
      event.context.nitro = event.context.nitro || { errors: [] };
      const envContext = event.node.req?.__unenv__;
      if (envContext) {
        Object.assign(event.context, envContext);
      }
      event.fetch = (req, init) => fetchWithEvent(event, req, init, { fetch: localFetch });
      event.$fetch = (req, init) => fetchWithEvent(event, req, init, {
        fetch: $fetch
      });
      event.waitUntil = (promise) => {
        if (!event.context.nitro._waitUntilPromises) {
          event.context.nitro._waitUntilPromises = [];
        }
        event.context.nitro._waitUntilPromises.push(promise);
        if (envContext?.waitUntil) {
          envContext.waitUntil(promise);
        }
      };
      event.captureError = (error, context) => {
        captureError(error, { event, ...context });
      };
    })
  );
  for (const h of handlers) {
    let handler = h.lazy ? lazyEventHandler(h.handler) : h.handler;
    if (h.middleware || !h.route) {
      const middlewareBase = (config.app.baseURL + (h.route || "/")).replace(
        /\/+/g,
        "/"
      );
      h3App.use(middlewareBase, handler);
    } else {
      const routeRules = getRouteRulesForPath(
        h.route.replace(/:\w+|\*\*/g, "_")
      );
      if (routeRules.cache) {
        handler = cachedEventHandler(handler, {
          group: "nitro/routes",
          ...routeRules.cache
        });
      }
      router.use(h.route, handler, h.method);
    }
  }
  h3App.use(config.app.baseURL, router.handler);
  const app = {
    hooks,
    h3App,
    router,
    localCall,
    localFetch,
    captureError
  };
  for (const plugin of plugins) {
    try {
      plugin(app);
    } catch (err) {
      captureError(err, { tags: ["plugin"] });
      throw err;
    }
  }
  return app;
}
const nitroApp = createNitroApp();
const useNitroApp = () => nitroApp;

const localFetch = nitroApp.localFetch;
trapUnhandledNodeErrors();

export { localFetch };
//# sourceMappingURL=index.mjs.map
