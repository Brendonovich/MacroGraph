import { ReactiveSet } from "@solid-primitives/set";
import { ReactiveMap } from "@solid-primitives/map";
import { batch } from "solid-js";
import { createMutable } from "solid-js/store";
import { z } from "zod";
import { BaseType } from "./base";
import { None, Option, Some } from "./option";
import { AnyType, t, TypeVariant } from ".";
import { DataInput, DataOutput } from "../models";

/**
 * A Wildcard that belongs to a Node.
 */
export class Wildcard {
  types = new ReactiveSet<WildcardType>();
  value: Option<AnyType> = None;

  constructor(public id: string) {
    return createMutable(this);
  }
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
    return this.wildcard.value.map((v) => v.variant()).unwrapOr("wildcard");
  }

  toString(): string {
    return this.wildcard.value
      .map((v) => `Wildcard(${v.toString()})`)
      .unwrapOr("Wildcard");
  }

  asZodType(): z.ZodType {
    return this.wildcard.value
      .map((v) => v.asZodType())
      .unwrapOrElse(() => z.any());
  }

  getWildcards(): Wildcard[] {
    return [this.wildcard];
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

function connectWildcardsInTypes(t1: t.Any, t2: t.Any) {
  if (t1 instanceof t.Wildcard || t2 instanceof t.Wildcard) {
    if (t1 instanceof t.Wildcard) t1.addConnection(t2);
    if (t2 instanceof t.Wildcard) t2.addConnection(t1);
  } else if (t1 instanceof t.List && t2 instanceof t.List) {
    connectWildcardsInTypes(t1.inner, t2.inner);
  } else if (t1 instanceof t.Option && t2 instanceof t.Option) {
    connectWildcardsInTypes(t1.inner, t2.inner);
  } else if (t1 instanceof t.Map && t2 instanceof t.Map) {
    connectWildcardsInTypes(t1.value, t2.value);
  }
}

export function disconnectWildcardsInIO(output: DataOutput, input: DataInput) {
  disconnectWildcardsInTypes(output.type, input.type);
}

function disconnectWildcardsInTypes(t1: t.Any, t2: t.Any) {
  batch(() => {
    if (t1 instanceof t.Wildcard || t2 instanceof t.Wildcard) {
      if (t1 instanceof t.Wildcard) t1.removeConnection(t2);
      if (t2 instanceof t.Wildcard) t2.removeConnection(t1);
    } else if (t1 instanceof t.List && t2 instanceof t.List) {
      disconnectWildcardsInTypes(t1.inner, t2.inner);
    } else if (t1 instanceof t.Option && t2 instanceof t.Option) {
      disconnectWildcardsInTypes(t1.inner, t2.inner);
    } else if (t1 instanceof t.Map && t2 instanceof t.Map) {
      disconnectWildcardsInTypes(t1.value, t2.value);
    }
  });
}
