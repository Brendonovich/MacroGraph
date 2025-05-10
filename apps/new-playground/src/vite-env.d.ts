/// <reference types="vite/client" />

declare module "macrograph:package-settings?package=*" {
  export default {} as import("solid-js").Component<
    import("./package-settings-utils").SettingsProps<any, any>
  >;
}
