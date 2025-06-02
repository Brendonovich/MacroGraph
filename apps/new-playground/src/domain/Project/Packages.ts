import { Effect, Option, Scope, SubscriptionRef } from "effect";
import { Package, PackageBuildReturn } from "../../package";
import { HttpApp } from "@effect/platform";

export type PackageEntry = {
  pkg: Package;
  state: Option.Option<SubscriptionRef.SubscriptionRef<any>>;
  rpcServer: Option.Option<HttpApp.Default<never, Scope.Scope>>;
  ret: PackageBuildReturn<any, any>;
};

export class ProjectPackages extends Effect.Service<ProjectPackages>()(
  "ProjectPackages",
  {
    effect: Effect.gen(function* () {
      const packages = new Map<string, PackageEntry>();

      return packages;
    }),
  },
) {}
