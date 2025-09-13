import { DatabaseError } from "@macrograph/web-domain";
import { Effect } from "effect";

import { db } from "~/drizzle";

export class Database extends Effect.Service<Database>()("Database", {
	effect: Effect.gen(function* () {
		const use = <A>(f: (_db: typeof db) => Promise<A>) =>
			Effect.tryPromise({
				try: () => f(db),
				catch: (error) => new DatabaseError({ cause: error }),
			}).pipe(Effect.tapErrorCause(Effect.logError));

		return { use } as const;
	}),
}) {}
