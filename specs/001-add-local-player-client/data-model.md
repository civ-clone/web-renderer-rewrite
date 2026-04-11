# Data Model: Local Player Client Relay

## Entity: LocalPlayerClient

- Purpose: Frontend-facing client participant that maps intents, relays commands, and returns mandatory actions.
- Fields:
  - `clientId: string`
  - `playerId: string`
  - `inFlightSubmission?: SubmissionLock`
  - `lastKnownTurnToken?: string`
  - `supportedIntentTypes: FrontendIntentType[]`
- Relationships:
  - Uses `FrontendCommandIntent` as input.
  - Produces `BackendCommandRequest` for backend relay.
  - Produces `CommandOutcome` and `MandatoryActionView[]` for frontend.
- Validation rules:
  - Must only relay intents for `supportedIntentTypes`.
  - Must reject if `inFlightSubmission` matches duplicate key.
  - Must enforce active-player alignment (`playerId` must match action owner).

## Entity: FrontendCommandIntent

- Purpose: UI-originated representation of a selected action.
- Fields:
  - `intentId: string`
  - `type: FrontendIntentType`
  - `actionId: string`
  - `turnToken: string`
  - `payload: Record<string, unknown>`
  - `submittedAt: number`
- Validation rules:
  - `actionId` and `turnToken` are required and non-empty.
  - `type` must be supported by `LocalPlayerClient` mapper.
  - `payload` must satisfy per-intent schema before translation.

## Entity: BackendCommandRequest

- Purpose: Backend-consumable command emitted by client relay layer.
- Fields:
  - `commandType: string`
  - `playerId: string`
  - `turnToken: string`
  - `commandPayload: Record<string, unknown>`
  - `requestId: string`
- Validation rules:
  - Deterministic mapping from a valid `FrontendCommandIntent`.
  - Includes dedupe-relevant identifiers (`requestId`, `turnToken`).

## Entity: MandatoryActionView

- Purpose: Frontend render model for required player decisions.
- Fields:
  - `actionId: string`
  - `label: string`
  - `description?: string`
  - `intentType: FrontendIntentType`
  - `turnToken: string`
  - `metadata?: Record<string, unknown>`
- Validation rules:
  - `actionId` unique within a returned action list.
  - Every returned item represents a currently mandatory action for the active local player.

## Entity: CommandOutcome

- Purpose: Result contract returned after submit attempts.
- Fields:
  - `status: "success" | "rejected" | "transport_error" | "interpretation_error"`
  - `message: string`
  - `requestId: string`
  - `updatedMandatoryActions: MandatoryActionView[]`
  - `recoverable: boolean`
- Validation rules:
  - Always includes `status`, `message`, and `requestId`.
  - `updatedMandatoryActions` is refreshed after both success and failure when backend state is available.

## Entity: SubmissionLock

- Purpose: Guard against duplicate processing within one interaction window.
- Fields:
  - `dedupeKey: string` (derived from `actionId + turnToken + playerId`)
  - `requestId: string`
  - `createdAt: number`
  - `state: "in_flight" | "released"`
- Validation rules:
  - A second submission with the same `dedupeKey` while `state === "in_flight"` must not execute backend relay.

## State Transitions

1. `Idle` -> `IntentReceived` when a frontend submission arrives.
2. `IntentReceived` -> `RejectedInterpretation` if intent schema/type validation fails.
3. `IntentReceived` -> `RejectedDuplicate` if dedupe key is already in flight.
4. `IntentReceived` -> `Relaying` after request mapping succeeds and lock is acquired.
5. `Relaying` -> `CompletedSuccess` when backend applies command.
6. `Relaying` -> `CompletedRejected` when backend rejects command (stale/invalid).
7. `Relaying` -> `CompletedTransportError` when backend is unavailable.
8. Any completed state -> `Idle` after lock release and action refresh publication.

