/// <reference types="vite/client" />

declare module "macrograph:package-settings" {
  export default {} as Record<string, () => Promise<PackageSettingsModule>>;
}

declare interface PackageSettingsModule {
  default: import("solid-js").Component<
    import("./package-settings-utils").SettingsProps<any, any>
  >;
  Rpcs: import("@effect/rpc/RpcGroup").RpcGroup<any>;
}
