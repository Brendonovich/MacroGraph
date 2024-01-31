import { z } from "zod";

export const CREDENTIALS = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
