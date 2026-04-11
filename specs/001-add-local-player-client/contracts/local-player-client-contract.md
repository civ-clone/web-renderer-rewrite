# Contract: LocalPlayer Client Interface

## Scope

Typed module contract between frontend UI flows and the `LocalPlayer` client implementation.

## Type Definitions

```ts
export type CommandStatus =
  | "success"
  | "rejected"
  | "transport_error"
  | "interpretation_error";

export interface MandatoryActionView {
  actionId: string;
  label: string;
  description?: string;
  intentType: string;
  turnToken: string;
  metadata?: Record<string, unknown>;
}

export interface FrontendCommandIntent {
  intentId: string;
  type: string;
  actionId: string;
  turnToken: string;
  payload: Record<string, unknown>;
  submittedAt: number;
}

export interface CommandOutcome {
  status: CommandStatus;
  message: string;
  requestId: string;
  updatedMandatoryActions: MandatoryActionView[];
  recoverable: boolean;
}

export interface LocalPlayerClientContract {
  getMandatoryActions(): Promise<MandatoryActionView[]>;
  submitIntent(intent: FrontendCommandIntent): Promise<CommandOutcome>;
}
```

## Behavioral Guarantees

1. `getMandatoryActions()` returns the complete current mandatory-action set for the active local player.
2. `submitIntent(...)` performs deterministic intent-to-command mapping and relays to backend exactly once per dedupe key (`actionId + turnToken + playerId`) while in flight.
3. `submitIntent(...)` always returns a `CommandOutcome` with a user-displayable `message` and refreshed `updatedMandatoryActions` when backend state is available.
4. On interpretation failure, no backend command is sent and `status = "interpretation_error"`.
5. On backend rejection (stale/invalid action), `status = "rejected"`, `recoverable = true`, and refreshed actions are returned.

## Error Contract

- `interpretation_error`: unsupported intent type, missing required fields, or payload schema mismatch.
- `rejected`: backend receives request but declines it (stale/invalid/unavailable action).
- `transport_error`: backend request cannot complete due to transport/connectivity failure.

All statuses are non-throwing outcomes for UX consistency; transport/runtime exceptions are normalized into `CommandOutcome`.

## Compatibility Rules

- Additive fields in `MandatoryActionView.metadata` are allowed.
- `status` enum values are stable for this feature increment.
- Breaking changes require plan/spec updates and migration notes per constitution principle III.

