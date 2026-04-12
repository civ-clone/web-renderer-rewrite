# Contract: New Game Bootstrap Interface

## Scope

Typed interface contract between frontend start control flow and backend session bootstrap orchestration.

## Type Definitions

```ts
export type SessionStatus = "idle" | "starting" | "active" | "failed";

export type StartupFailureCode =
  | "module_init"
  | "participant_create"
  | "registry_bind"
  | "transport"
  | "unknown";

export interface StartGameRequest {
  requestId: string;
  requestedAt: number;
  source: "ui_button";
}

export interface StartupFailure {
  code: StartupFailureCode;
  message: string;
  recoverable: true;
  detectedAt: number;
}

export interface ParticipantSummary {
  totalParticipants: 3;
  localParticipants: 1;
  aiParticipants: 2;
  allRegistered: boolean;
}

export interface StartGameResult {
  requestId: string;
  status: "started" | "already_started" | "failed";
  sessionId?: string;
  participantSummary?: ParticipantSummary;
  failure?: StartupFailure;
}

export interface SessionStateView {
  sessionId?: string;
  status: SessionStatus;
  canStart: boolean;
  startupFailure?: StartupFailure;
}

export interface MandatoryActionView {
  actionId: string;
  label: string;
  description?: string;
  turnToken: string;
  metadata?: Record<string, unknown>;
}

export interface MandatoryActionsAvailable {
  sessionId: string;
  playerId: string;
  turnToken: string;
  actions: MandatoryActionView[];
  updatedAt: number;
}
```

## Behavioral Guarantees

1. Frontend startup intent is explicit and represented only by `StartGameRequest`.
2. Backend must never begin a session before receiving a valid start request.
3. Successful start returns `status = "started"` with participant counts fixed at `1 local + 2 AI`.
4. Duplicate start requests in `starting` or `active` state return `status = "already_started"` and do not create additional participants.
5. On any startup failure, result includes `status = "failed"` and `StartupFailure` with `recoverable = true`.
6. Mandatory actions become visible to frontend only after session reaches `active`.

## Error Contract

- `module_init`: required gameplay module failed to initialize.
- `participant_create`: participant identity/client creation failed.
- `registry_bind`: participant/player/client registration failed.
- `transport`: frontend-backend startup signaling failed.
- `unknown`: fallback classification for uncategorized startup errors.

Error outcomes are non-silent and must produce user-visible recoverable state.

## Compatibility Rules

- `SessionStatus` and `StartupFailureCode` enums are stable for this feature increment.
- Additive fields in `MandatoryActionView.metadata` are allowed.
- Breaking contract changes require spec/plan updates and migration notes per constitution principle III.

