/**
 * @civ-clone/engine-adapter — validation boundary (WP-009)
 *
 * Validates raw unknown payloads at protocol trust boundaries (network ingress/egress).
 * Uses Zod schemas from @civ-clone/protocol-state to reject structurally invalid messages
 * before any domain logic or business-rule checking occurs.
 *
 * Design principles:
 * - Never throws — always returns a discriminated BoundaryValidationResult.
 * - Call at ingress/egress only (network edge, worker boundary).
 * - Do NOT use on the hot path once the message is already typed and trusted.
 * - Sits below ActionCommandHandler: schema validation first, business rules second.
 *
 * Typical ingress call chain:
 *   raw message arrives
 *     → ValidationBoundary.validateInboundMessage()   ← schema layer (WP-009)
 *     → ActionCommandHandler.onActionCommand()         ← business rules layer (WP-003)
 */

import {
  validate,
  actionCommandSchema,
  engineMessageSchema,
  rendererMessageSchema,
  snapshotEnvelopeSchema,
  deltaEnvelopeSchema,
  actionResultSchema,
  turnEndRequestSchema,
  turnEndResultSchema,
  type ActionCommand,
  type ActionResult,
  type DeltaEnvelope,
  type EngineMessage,
  type RendererMessage,
  type SnapshotEnvelope,
  type TurnEndRequest,
  type TurnEndResult,
} from "@civ-clone/protocol-state";

// ---------------------------------------------------------------------------
// Boundary error codes
// ---------------------------------------------------------------------------

/**
 * Protocol-level error codes emitted by the validation boundary.
 * These are schema/structural failures, distinct from business-rule rejection
 * codes produced by ActionCommandHandler (e.g. ACTION_NOT_FOUND, MATCH_ID_MISMATCH).
 */
export const BOUNDARY_ERROR_CODES = {
  /** Message does not conform to the expected protocol schema. */
  SCHEMA_INVALID: "SCHEMA_INVALID",
} as const;

export type BoundaryErrorCode =
  (typeof BOUNDARY_ERROR_CODES)[keyof typeof BOUNDARY_ERROR_CODES];

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type BoundaryValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errorCode: BoundaryErrorCode; errors: string[] };

// ---------------------------------------------------------------------------
// ValidationBoundary
// ---------------------------------------------------------------------------

/**
 * Stateless boundary validator for all protocol message types.
 *
 * Engine-side (ingress from renderer):
 *   - validateInboundMessage()  — full RendererMessage discriminated union
 *   - validateActionCommand()   — individual ActionCommand (convenience)
 *   - validateTurnEndRequest()  — individual TurnEndRequest (convenience)
 *
 * Renderer-side (egress from engine / ingress to renderer):
 *   - validateOutboundMessage() — full EngineMessage discriminated union
 *   - validateSnapshot()        — individual SnapshotEnvelope (convenience)
 *   - validateDelta()           — individual DeltaEnvelope (convenience)
 *   - validateActionResult()    — individual ActionResult (convenience)
 *   - validateTurnEndResult()   — individual TurnEndResult (convenience)
 */
export class ValidationBoundary {
  // ---- Inbound (renderer → engine) ----------------------------------------

  /**
   * Validate a raw inbound message against the full RendererMessage schema.
   * Use this at the network/worker boundary before dispatching to domain handlers.
   */
  validateInboundMessage(raw: unknown): BoundaryValidationResult<RendererMessage> {
    return this.#wrap(validate(rendererMessageSchema, raw));
  }

  /**
   * Validate a raw payload as a standalone ActionCommand.
   * Useful when transport unwraps the message envelope before handing it off.
   */
  validateActionCommand(raw: unknown): BoundaryValidationResult<ActionCommand> {
    return this.#wrap(validate(actionCommandSchema, raw));
  }

  /**
   * Validate a raw payload as a standalone TurnEndRequest.
   */
  validateTurnEndRequest(raw: unknown): BoundaryValidationResult<TurnEndRequest> {
    return this.#wrap(validate(turnEndRequestSchema, raw));
  }

  // ---- Outbound (engine → renderer) ----------------------------------------

  /**
   * Validate a raw outbound message against the full EngineMessage schema.
   * Use this at the egress boundary before serializing to transport.
   */
  validateOutboundMessage(raw: unknown): BoundaryValidationResult<EngineMessage> {
    return this.#wrap(validate(engineMessageSchema, raw));
  }

  /**
   * Validate a raw payload as a standalone SnapshotEnvelope.
   */
  validateSnapshot(raw: unknown): BoundaryValidationResult<SnapshotEnvelope> {
    return this.#wrap(validate(snapshotEnvelopeSchema, raw));
  }

  /**
   * Validate a raw payload as a standalone DeltaEnvelope.
   */
  validateDelta(raw: unknown): BoundaryValidationResult<DeltaEnvelope> {
    return this.#wrap(validate(deltaEnvelopeSchema, raw));
  }

  /**
   * Validate a raw payload as a standalone ActionResult.
   */
  validateActionResult(raw: unknown): BoundaryValidationResult<ActionResult> {
    return this.#wrap(validate(actionResultSchema, raw));
  }

  /**
   * Validate a raw payload as a standalone TurnEndResult.
   */
  validateTurnEndResult(raw: unknown): BoundaryValidationResult<TurnEndResult> {
    return this.#wrap(validate(turnEndResultSchema, raw));
  }

  // ---- Internal -----------------------------------------------------------

  #wrap<T>(
    result: { ok: true; data: unknown } | { ok: false; errors: string[] }
  ): BoundaryValidationResult<T> {
    if (result.ok) {
      // Zod's inferred type can differ from the canonical TypeScript interface
      // (e.g., z.unknown() marks `value` optional on PatchOpSet). We trust the
      // schema validated the shape at runtime and cast to the interface type.
      return { ok: true, data: result.data as T };
    }
    return {
      ok: false,
      errorCode: BOUNDARY_ERROR_CODES.SCHEMA_INVALID,
      errors: result.errors,
    };
  }
}


