import { z } from "zod";

export const STATE = z.object({
  targetOrigin: z.string(),
});
