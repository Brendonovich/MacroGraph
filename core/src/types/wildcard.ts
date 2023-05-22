import { ReactiveSet } from "@solid-primitives/set";
import { createMutable } from "solid-js/store";
import { BaseType } from "./any";
import { None, Option, OptionType, Some } from "./option";
import { ListType } from "./list";
import { batch, createEffect } from "solid-js";
import { AnyType, TypeVariant } from ".";

export const newWildcard = () => {
  const state = createMutable({
    connections: new ReactiveSet<AnyType>(),
    value: None as Option<AnyType>,
    dispose: createEffect(() => {
      let value = None;

      for (const t of state.connections) {
        if (t instanceof WildcardType) {
          t.wildcard.value.map((t) => (value = Some(t)));
        } else {
          value = Some(t);
        }
      }

      if (state.value.ne(value)) state.value = value;
    }),
  });

  return state;
};

export type Wildcard = ReturnType<typeof newWildcard>;

export class WildcardType extends BaseType {
  constructor(public wildcard: Wildcard) {
    super();
  }

  canConnect(a: AnyType): boolean {
    return this.wildcard.value.map((v) => v.canConnect(a)).unwrapOr(true);
  }

  default(): any {
    return this.wildcard.value.map((v) => v.default());
  }

  variant(): TypeVariant {
    return "wildcard";
  }
}

export function connectWildcardsInTypes(t1: AnyType, t2: AnyType) {
  batch(() => {
    if (t1 instanceof WildcardType || t2 instanceof WildcardType) {
      if (t1 instanceof WildcardType) t1.wildcard.connections.add(t2);
      if (t2 instanceof WildcardType) t2.wildcard.connections.add(t1);
    } else if (t1 instanceof ListType && t2 instanceof ListType) {
      connectWildcardsInTypes(t1.inner, t2.inner);
    } else if (t1 instanceof OptionType && t2 instanceof OptionType) {
      connectWildcardsInTypes(t1.inner, t2.inner);
    }
  });
}
