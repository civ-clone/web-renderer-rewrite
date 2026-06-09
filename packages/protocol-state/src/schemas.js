/**
 * Zod schemas for runtime validation at protocol trust boundaries.
 * Use these only at ingress/egress points (network, worker boundary).
 * Do not validate with these on every hot-path operation.
 */
import { z } from "zod";
import { PROTOCOL_VERSION } from "./types.js";
// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------
const protocolVersion = z.literal(PROTOCOL_VERSION);
const entityId = z.string().min(1);
// ---------------------------------------------------------------------------
// Entity state schemas (provisional)
// ---------------------------------------------------------------------------
// tableName -> entityId -> raw state object
const entitiesSchema = z.record(z.record(z.record(z.unknown())));
// indexName -> key -> id[]
const indexesSchema = z.record(z.record(z.array(z.string())));
// ---------------------------------------------------------------------------
// Action requirements
// ---------------------------------------------------------------------------
const mandatoryRequirementSchema = z.object({
    actionType: z.string(),
    valueType: z.string().optional(),
    valueId: entityId.optional(),
});
const availableActionSchema = z.object({
    actionType: z.string(),
    valueType: z.string().optional(),
    valueId: entityId.optional(),
});
export const actionDescriptorSchema = z.object({
    actionType: z.string(),
    mandatory: z.boolean(),
    valueType: z.string().optional(),
    valueId: entityId.optional(),
});
export const playerActionDescriptorSchema = z.object({
    tier: z.literal("player"),
    actionType: z.string(),
    mandatory: z.boolean(),
    valueType: z.string().optional(),
    valueId: entityId.optional(),
});
export const unitActionDescriptorSchema = z.object({
    tier: z.literal("unit"),
    actionType: z.string(),
    mandatory: z.literal(false),
    unitId: entityId,
    fromTileId: z.string().min(1),
    toTileId: z.string().min(1).optional(),
});
export const actionRequirementStateSchema = z.object({
    mandatory: z.array(mandatoryRequirementSchema),
    optional: z.array(availableActionSchema),
});
// ---------------------------------------------------------------------------
// Snapshot envelope
// ---------------------------------------------------------------------------
export const snapshotEnvelopeSchema = z.object({
    protocolVersion,
    matchId: z.string(),
    stateVersion: z.number().int().nonnegative(),
    turn: z.number().int().nonnegative(),
    entities: entitiesSchema,
    indexes: indexesSchema,
    requirementsByPlayer: z.record(actionRequirementStateSchema),
    actionsByPlayer: z.record(z.array(playerActionDescriptorSchema)).optional(),
    unitActionsById: z.record(z.array(unitActionDescriptorSchema)).optional(),
    checksum: z.string(),
});
// ---------------------------------------------------------------------------
// Delta envelope
// ---------------------------------------------------------------------------
const patchOpSchema = z.discriminatedUnion("op", [
    z.object({ op: z.literal("set"), path: z.string(), value: z.unknown() }),
    z.object({ op: z.literal("remove"), path: z.string() }),
    z.object({ op: z.literal("arrayPush"), path: z.string(), value: z.unknown() }),
    z.object({ op: z.literal("arrayRemoveItem"), path: z.string(), value: z.unknown() }),
]);
export const deltaEnvelopeSchema = z.object({
    protocolVersion,
    matchId: z.string(),
    baseVersion: z.number().int().nonnegative(),
    targetVersion: z.number().int().positive(),
    patches: z.array(patchOpSchema),
    resultChecksum: z.string().optional(),
});
// ---------------------------------------------------------------------------
// Action commands
// ---------------------------------------------------------------------------
export const actionCommandSchema = z.object({
    protocolVersion,
    commandId: z.string().min(1),
    matchId: z.string(),
    actorPlayerId: entityId,
    clientSeq: z.number().int().nonnegative(),
    expectedTurn: z.number().int().nonnegative().optional(),
    tier: z.enum(["player", "unit"]),
    actionType: z.string(),
    valueType: z.string().optional(),
    valueId: entityId.optional(),
    unitId: entityId.optional(),
    fromTileId: z.string().min(1).optional(),
    toTileId: z.string().min(1).optional(),
    payload: z.unknown().optional(),
    sentAt: z.number().int().positive(),
});
export const actionResultSchema = z.object({
    commandId: z.string(),
    status: z.enum(["accepted", "rejected", "deferred"]),
    reasonCode: z.string().optional(),
    message: z.string().optional(),
    serverSeq: z.number().int().nonnegative(),
    resultingStateVersion: z.number().int().nonnegative().optional(),
});
// ---------------------------------------------------------------------------
// Turn end
// ---------------------------------------------------------------------------
export const turnEndRequestSchema = z.object({
    protocolVersion,
    matchId: z.string(),
    actorPlayerId: entityId,
    commandId: z.string().min(1),
    clientSeq: z.number().int().nonnegative(),
    sentAt: z.number().int().positive(),
});
export const turnEndResultSchema = z.object({
    commandId: z.string(),
    status: z.enum(["accepted", "rejected"]),
    unmetRequirements: z.array(mandatoryRequirementSchema).optional(),
    reasonCode: z.string().optional(),
});
// ---------------------------------------------------------------------------
// Transport message discriminated unions
// ---------------------------------------------------------------------------
export const engineMessageSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("snapshot"), payload: snapshotEnvelopeSchema }),
    z.object({ type: z.literal("delta"), payload: deltaEnvelopeSchema }),
    z.object({ type: z.literal("actionResult"), payload: actionResultSchema }),
    z.object({ type: z.literal("turnEndResult"), payload: turnEndResultSchema }),
]);
export const rendererMessageSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("action"), payload: actionCommandSchema }),
    z.object({ type: z.literal("turnEnd"), payload: turnEndRequestSchema }),
    z.object({
        type: z.literal("requestSnapshot"),
        matchId: z.string(),
        actorPlayerId: entityId,
    }),
]);
//# sourceMappingURL=schemas.js.map