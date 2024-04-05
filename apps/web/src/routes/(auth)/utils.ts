import { z } from "zod";

export const CREDENTIALS = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function hashPassword(
  password: string,
  salt: string
): Promise<string> {
  const utf8 = new TextEncoder().encode(`${salt}:${password}`);

  const hashBuffer = await crypto.subtle.digest({ name: "SHA-256" }, utf8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((bytes) => bytes.toString(16).padStart(2, "0")).join("");
}
