import { ReactiveSet } from "@solid-primitives/set";
import { ReactiveMap } from "@solid-primitives/map";
import { batch } from "solid-js";
import { BaseType } from "./any";
import { None, Option, OptionType, Some } from "./option";
import { ListType } from "./list";
import { AnyType, TypeVariant } from ".";
import { DataInput, DataOutput } from "../models";
import { createMutable } from "solid-js/store";

/**
 * A Wildcard that belongs to a Node.
 */
export type Wildcard = {
  types: ReactiveSet<WildcardType>;
  value: Option<AnyType>;
};

export function newWildcard(): Wildcard {
  return createMutable({
    types: new ReactiveSet(),
    value: None,
  });
}

/**
 * A type that is linked to a Wildcard.
 * May be owned by an AnyType or data IO.
 */
export class WildcardType extends BaseType {
  connections = new ReactiveMap<AnyType, number>();

  constructor(public wildcard: Wildcard) {
    super();

    wildcard.types.add(this);
  }

  addConnection(t: AnyType) {
    const count = this.connections.get(t);

    this.connections.set(t, (count ?? 0) + 1);

    const resolver = new WildcardResolver(this);

    const newValue = resolver.resolveType();

    resolver.allWildcards.forEach((w) => (w.value = newValue));
  }

  removeConnection(t: AnyType) {
    const count = this.connections.get(t) ?? 0;

    if (count > 1) this.connections.set(t, count - 1);
    else this.connections.delete(t);

    const resolver = new WildcardResolver(this);

    const newValue = resolver.resolveType();

    resolver.allWildcards.forEach((w) => (w.value = newValue));
  }

  default(): any {
    return this.wildcard.value.map((v) => v.default());
  }

  variant(): TypeVariant {
    return "wildcard";
  }

  toString(): string {
    return this.wildcard.value.map((v) => v.toString()).unwrapOr("Wildcard");
  }
}

class WildcardResolver {
  allWildcards = new Set<Wildcard>();

  constructor(public root: WildcardType) {
    this.resolveWildcard(root.wildcard);
  }

  resolveWildcard(wildcard: Wildcard) {
    if (this.allWildcards.has(wildcard)) return;
    this.allWildcards.add(wildcard);

    for (const type of [...wildcard.types]) {
      for (const conn of [...type.connections.keys()]) {
        if (conn instanceof WildcardType) {
          this.resolveWildcard(conn.wildcard);
        }
      }
    }
  }

  resolveType(): Option<AnyType> {
    for (const wildcard of this.allWildcards) {
      for (const type of wildcard.types) {
        for (const conn of type.connections.keys()) {
          if (!(conn instanceof WildcardType)) return Some(conn);
        }
      }
    }

    return None;
  }
}

export function connectWildcardsInIO(output: DataOutput, input: DataInput) {
  connectWildcardsInTypes(output.type, input.type);
}

function connectWildcardsInTypes(t1: AnyType, t2: AnyType) {
  batch(() => {
    if (t1 instanceof WildcardType || t2 instanceof WildcardType) {
      if (t1 instanceof WildcardType) t1.addConnection(t2);
      if (t2 instanceof WildcardType) t2.addConnection(t1);
    } else if (t1 instanceof ListType && t2 instanceof ListType) {
      connectWildcardsInTypes(t1.inner, t2.inner);
    } else if (t1 instanceof OptionType && t2 instanceof OptionType) {
      connectWildcardsInTypes(t1.inner, t2.inner);
    }
  });
}

export function disconnectWildcardsInIO(output: DataOutput, input: DataInput) {
  disconnectWildcardsInTypes(output.type, input.type);
}

function disconnectWildcardsInTypes(t1: AnyType, t2: AnyType) {
  batch(() => {
    if (t1 instanceof WildcardType || t2 instanceof WildcardType) {
      if (t1 instanceof WildcardType) t1.removeConnection(t2);
      if (t2 instanceof WildcardType) t2.removeConnection(t1);
    } else if (t1 instanceof ListType && t2 instanceof ListType) {
      disconnectWildcardsInTypes(t1.inner, t2.inner);
    } else if (t1 instanceof OptionType && t2 instanceof OptionType) {
      disconnectWildcardsInTypes(t1.inner, t2.inner);
    }
  });
}
