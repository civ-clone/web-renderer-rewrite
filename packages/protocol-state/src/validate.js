/**
 * Validate an unknown value against a Zod schema.
 * Returns a discriminated result — never throws.
 * Use only at protocol trust boundaries, not on the hot path.
 */
export function validate(schema, input) {
    const result = schema.safeParse(input);
    if (result.success) {
        return { ok: true, data: result.data };
    }
    return {
        ok: false,
        errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
    };
}
//# sourceMappingURL=validate.js.map