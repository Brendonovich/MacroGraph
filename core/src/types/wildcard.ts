import { ReactiveSet } from "@solid-primitives/set";
import { batch, createEffect, createRoot, untrack } from "solid-js";
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
  types = new ReactiveSet<t.Wildcard>();

  dispose: () => void;

  value: Option<t.Any> = None as any;

  constructor(public id: string) {
    const reactiveThis = createMutable(this);

    this.dispose = createRoot((dispose) => {
      createEffect(() => {
        const conns = [...this.types].flatMap((t) => [...t.connections]);

        untrack(() => {
          if (conns.length === 0) {
            reactiveThis.value = None;
            return;
          }

          const nonWildcard = conns.find((v) => !(v instanceof t.Wildcard));

          if (nonWildcard) {
            if (
              reactiveThis.value.isNone() ||
              !reactiveThis.value.unwrap().eq(nonWildcard)
            ) {
              reactiveThis.value = Some(nonWildcard);
            }
          } else {
            const wildcard = conns[0];

            if (wildcard instanceof t.Wildcard) {
              reactiveThis.value = wildcard.wildcard.value;
            }
          }
        });
      });

      return dispose;
    });

    return reactiveThis;
  }
}

/**
 * A type that is linked to a Wildcard.
 * May be owned by an AnyType or data IO.
 */
export class WildcardType extends BaseType {
  connections = new ReactiveSet<t.Any>();

  constructor(public wildcard: Wildcard) {
    super();

    wildcard.types.add(this);
  }

  addConnection(t: AnyType) {
    this.connections.add(t);
  }

  removeConnection(t: AnyType) {
    this.connections.delete(t);
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

  eq(other: t.Any) {
    return other instanceof t.Wildcard && other.wildcard === this.wildcard;
  }
}

export function connectWildcardsInIO(output: DataOutput, input: DataInput) {
  connectWildcardsInTypes(output.type, input.type);
}

export function connectWildcardsInTypes(t1: t.Any, t2: t.Any) {
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

export function disconnectWildcardsInTypes(t1: t.Any, t2: t.Any) {
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
