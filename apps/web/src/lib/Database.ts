import * as Effect from "effect/Effect";
import { DatabaseError } from "@macrograph/web-domain";
import type { Query } from "drizzle-orm";

import { db } from "~/drizzle";

export class Database extends Effect.Service<Database>()("Database", {
	effect: Effect.gen(function* () {
		const use = <A>(
			f: (_db: ReturnType<typeof db>) => Promise<A> & { toSQL?(): Query },
		) => {
			const query = f(db());
			return Effect.tryPromise({
				try: () => query,
				catch: (error) => new DatabaseError({ cause: error }),
			}).pipe(
				Effect.tapErrorCause(Effect.logError),
				Effect.withSpan("Database.use", {
					attributes:
						query.toSQL !== undefined ? { sql: query.toSQL().sql } : {},
				}),
			);
		};

		return { use } as const;
	}),
}) {}
