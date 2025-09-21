import { Policy } from "@macrograph/server-domain";
import type { UseQueryResult } from "@tanstack/solid-query";
import { Cause, Either, Schema } from "effect";
import type { Accessor, JSX } from "solid-js";

const isPolicyDenied = Schema.is(Policy.PolicyDeniedError);

export function MatchEffectQuery<D, E>(props: {
  query: UseQueryResult<D, Cause.Cause<E>>;
  onSuccess?: (data: Accessor<D>) => JSX.Element;
  onError?: (
    error: Cause.Cause<Exclude<E, Policy.PolicyDeniedError>>,
  ) => JSX.Element;
}) {
  const asEither = (): Either.Either<Cause.Cause<E>, D> | void => {
    if (props.query.status === "error") return Either.right(props.query.error);
    if (props.query.status === "success") return Either.left(props.query.data);
  };

  return (
    <>
      {asEither()?.pipe(
        Either.match({
          onLeft: (data) => props.onSuccess?.(() => data),
          onRight: (e) => (
            <div class="w-full border-red-9 border bg-red-2 text-red-9 p-2	text-center">
              {Cause.isFailType(e) && isPolicyDenied(e.error)
                ? "Access Denied"
                : (props.onError?.(e as any) ?? "Unexpected Error Occurred")}
            </div>
          ),
        }),
      )}
    </>
  );
}
