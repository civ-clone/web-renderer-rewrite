import { z } from "zod";

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: string[] };

/**
 * Validate an unknown value against a Zod schema.
 * Returns a discriminated result — never throws.
 * Use only at protocol trust boundaries, not on the hot path.
 */
export function validate<T>(
  schema: z.ZodType<T>,
  input: unknown
): ValidationResult<T> {
  const result = schema.safeParse(input);
  if (result.success) {
	return { ok: true, data: result.data };
  }
  return {
	ok: false,
	errors: result.error.errors.map(
	  (e) => `${e.path.join(".")}: ${e.message}`
	),
  };
}

