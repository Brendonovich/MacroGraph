import { ReactiveSet } from "@solid-primitives/set";
import { batch, createMemo, createRoot, untrack } from "solid-js";
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

  // value: Option<t.Any> = None as any;
  value: () => Option<t.Any> = () => None;

  constructor(public id: string) {
    const reactiveThis = createMutable(this);

    this.dispose = createRoot((dispose) => {
      this.value = createMemo((prev) => {
        const conns = [...this.types].flatMap((t) => [...t.connections]);

        console.log("bruh");

        return untrack(() => {
          conns.sort((a, b) => {
            const aLen = a.getWildcards().length;
            const bLen = b.getWildcards().length;

            return aLen < bLen ? -1 : aLen > bLen ? 1 : 0;
          });

          if (conns.length === 0) {
            return None;
          }

          const nonWildcard = conns.find((v) => !(v instanceof t.Wildcard));

          if (nonWildcard) {
            if (!prev || prev.isNone() || !prev.unwrap().eq(nonWildcard)) {
              return Some(nonWildcard);
            }
          } else {
            const wildcard = conns[0] as t.Wildcard;

            return Some(wildcard);
          }

          return prev ?? None;
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
    return this.wildcard.value().map((v) => v.default());
  }

  variant(): TypeVariant {
    return this.wildcard
      .value()
      .map((v) => v.variant())
      .unwrapOr("wildcard");
  }

  toString(): string {
    return this.wildcard
      .value()
      .map((v) => `Wildcard(${v.toString()})`)
      .unwrapOr("Wildcard");
  }

  asZodType(): z.ZodType {
    return this.wildcard
      .value()
      .map((v) => v.asZodType())
      .unwrapOrElse(() => z.any());
  }

  getWildcards(): Wildcard[] {
    return this.wildcard
      .value()
      .map((v) => v.getWildcards())
      .unwrapOrElse(() => [this.wildcard]);
  }

  eq(other: t.Any) {
    return other instanceof t.Wildcard && other.wildcard === this.wildcard;
  }
}

export function connectWildcardsInIO(output: DataOutput, input: DataInput) {
  connectWildcardsInTypes(output.type, input.type);
}

export function connectWildcardsInTypes(t1Raw: t.Any, t2Raw: t.Any) {
  console.log(t1Raw, t2Raw);

  if (t1Raw instanceof t.Wildcard) t1Raw.addConnection(t2Raw);
  if (t2Raw instanceof t.Wildcard) t2Raw.addConnection(t1Raw);

  const t1 =
    t1Raw instanceof t.Wildcard
      ? (t1Raw.wildcard.value(), t1Raw.wildcard.value().unwrapOr(t1Raw))
      : t1Raw;

  const t2 =
    t2Raw instanceof t.Wildcard
      ? (t2Raw.wildcard.value(), t2Raw.wildcard.value().unwrapOr(t2Raw))
      : t2Raw;

  console.log(t1, t2);

  // if (t1 instanceof t.List && t2 instanceof t.List) {
  //   connectWildcardsInTypes(t1.inner, t2.inner);
  // } else if (t1 instanceof t.Option && t2 instanceof t.Option) {
  //   connectWildcardsInTypes(t1.inner, t2.inner);
  // } else
  if (t1 instanceof t.Map && t2 instanceof t.Map) {
    connectWildcardsInTypes(t1.value, t2.value);
  }
}

export function disconnectWildcardsInIO(output: DataOutput, input: DataInput) {
  disconnectWildcardsInTypes(output.type, input.type);
}

export function disconnectWildcardsInTypes(t1Raw: t.Any, t2Raw: t.Any) {
  batch(() => {
    if (t1Raw instanceof t.Wildcard) t1Raw.removeConnection(t2Raw);
    if (t2Raw instanceof t.Wildcard) t2Raw.removeConnection(t1Raw);

    const t1 =
      t1Raw instanceof t.Wildcard
        ? (t1Raw.wildcard.value(), t1Raw.wildcard.value().unwrapOr(t1Raw))
        : t1Raw;

    const t2 =
      t2Raw instanceof t.Wildcard
        ? (t2Raw.wildcard.value(), t2Raw.wildcard.value().unwrapOr(t2Raw))
        : t2Raw;

    // if (t1 instanceof t.List && t2 instanceof t.List) {
    //   disconnectWildcardsInTypes(t1.inner, t2.inner);
    // } else if (t1 instanceof t.Option && t2 instanceof t.Option) {
    //   disconnectWildcardsInTypes(t1.inner, t2.inner);
    // } else
    if (t1 instanceof t.Map && t2 instanceof t.Map) {
      disconnectWildcardsInTypes(t1.value, t2.value);
    }
  });
}
