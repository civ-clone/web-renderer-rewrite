# Data Model: New Game Interface Bootstrap

## Entity: NewGameSession

- Purpose: Runtime session container that progresses from idle to active only after explicit start.
- Fields:
  - `sessionId: string`
  - `status: "idle" | "starting" | "active" | "failed"`
  - `startedAt?: number`
  - `failure?: StartupFailure`
  - `initializationProfile: InitializationProfile`
- Relationships:
  - Owns `ParticipantRegistration[]`.
  - Produces local `MandatoryActionList` once active.
- Validation rules:
  - `status` starts as `idle` on page load.
  - Transition to `active` requires successful module initialization and participant/client registration.

## Entity: InitializationProfile

- Purpose: Defines required gameplay modules that must initialize before turn processing.
- Fields:
  - `modules: string[]`
  - `versionTag?: string`
  - `initializedAt?: number`
- Validation rules:
  - `modules` must be non-empty for valid startup.
  - All listed modules must initialize successfully before session becomes `active`.

## Entity: ParticipantRegistration

- Purpose: Represents one participant slot and its runtime binding.
- Fields:
  - `participantId: string`
  - `role: "local_human" | "ai"`
  - `playerId: string`
  - `clientType: "local_player" | "ai_client"`
  - `registered: boolean`
- Validation rules:
  - Exactly three records per new session start.
  - Exactly one `role = "local_human"` and two `role = "ai"`.
  - Every record must include both `playerId` and client binding before turn execution.

## Entity: StartGameRequest

- Purpose: Frontend intent to start a new game session.
- Fields:
  - `requestId: string`
  - `requestedAt: number`
  - `source: "ui_button"`
- Validation rules:
  - Must be ignored or treated as idempotent if session state is `starting` or `active`.

## Entity: StartGameResult

- Purpose: Backend response for a start request.
- Fields:
  - `requestId: string`
  - `sessionId?: string`
  - `status: "started" | "already_started" | "failed"`
  - `participantSummary?: ParticipantSummary`
  - `failure?: StartupFailure`
- Validation rules:
  - `status = "started"` requires `sessionId` and `participantSummary`.
  - `status = "failed"` requires `failure`.

## Entity: ParticipantSummary

- Purpose: Aggregate startup counts used by UI and tests.
- Fields:
  - `totalParticipants: 3`
  - `localParticipants: 1`
  - `aiParticipants: 2`
  - `allRegistered: boolean`
- Validation rules:
  - Count invariants must always hold for successful starts.
  - `allRegistered` must be true before session enters `active`.

## Entity: MandatoryActionList

- Purpose: Current required actions for the local participant after startup.
- Fields:
  - `sessionId: string`
  - `playerId: string`
  - `turnToken: string`
  - `actions: MandatoryActionView[]`
  - `updatedAt: number`
- Validation rules:
  - Must remain hidden while session is `idle` or `starting`.
  - Displayed only when session is `active` and `actions.length > 0`.

## Entity: StartupFailure

- Purpose: Recoverable failure information surfaced to frontend.
- Fields:
  - `code: "module_init" | "participant_create" | "registry_bind" | "transport" | "unknown"`
  - `message: string`
  - `recoverable: true`
  - `detectedAt: number`
- Validation rules:
  - Must be user-visible within SC-004 timing target.
  - Must not leave session state falsely marked as `active`.

## State Transitions

1. `idle` -> `starting` when `StartGameRequest` is accepted.
2. `starting` -> `failed` when module initialization or registration fails.
3. `starting` -> `active` when initialization profile succeeds, three participants are registered, and first mandatory-action request can be served.
4. `active` -> `active` on duplicate start request (`already_started` result, no state reset).
5. `failed` -> `starting` only when a fresh explicit start request retries bootstrap.

