import { z } from "zod";
export type ValidationResult<T> = {
    ok: true;
    data: T;
} | {
    ok: false;
    errors: string[];
};
/**
 * Validate an unknown value against a Zod schema.
 * Returns a discriminated result — never throws.
 * Use only at protocol trust boundaries, not on the hot path.
 */
export declare function validate<T>(schema: z.ZodType<T>, input: unknown): ValidationResult<T>;
//# sourceMappingURL=validate.d.ts.map