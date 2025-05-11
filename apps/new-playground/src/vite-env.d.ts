/// <reference types="vite/client" />

declare module "macrograph:package-settings?package=*" {
  export default {} as import("solid-js").Component<
    import("./package-settings-utils").SettingsProps<any, any>
  >;
}

declare module "macrograph:package-settings" {
  export default {} as Record<
    string,
    () => {
      default: import("solid-js").Component<
        import("./package-settings-utils").SettingsProps<any, any>
      >;
    }
  >;
}
